import express from "express";
import programs from "../payload/programs2.json" assert { type: "json" };
import axios from "axios";

// for i in {3001..3010}; do
//   PORT=$i node server.js &
// done
// wait

// for port in {3001..3010}; do
//   pid=$(lsof -i :$port -t); if [ "$pid" ]; then kill $pid; fi
// done

const router = express.Router();

// Setup 10 instance URLs
const INSTANCE_URLS = Array.from(
  { length: 10 },
  (_, i) => `http://localhost:${3001 + i}/workflow`
);

// Track instance usage
const instanceStatus = INSTANCE_URLS.map((url, i) => ({
  index: i + 1,
  url,
  busy: false,
}));

// Utility: sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Track IDs
const doneIds = [];
const mostFailedIds = [];
const permanentlyFailedIds = [];

// Dispatcher with retry logic and tracking
const processProgramWithRetry = async (programId, i, total, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    while (true) {
      const freeInstance = instanceStatus.find((inst) => !inst.busy);
      if (freeInstance) {
        const { url, index } = freeInstance;

        freeInstance.busy = true;
        const start = Date.now();

        console.log(`⏳(${i + 1}/${total}) Assigned: ${programId} to ${index}`);

        try {
          const res = await axios.post(
            url,
            { id: programId },
            { timeout: 1000 * 300 }
          );

          const duration = ((Date.now() - start) / 1000).toFixed(2);
          console.log(`✅ ${programId} on ${index} in ${duration}s`);

          if (attempt === retries) {
            mostFailedIds.push(programId);
          } else {
            doneIds.push(programId);
          }

          freeInstance.busy = false;
          return;
        } catch (err) {
          const duration = ((Date.now() - start) / 1000).toFixed(2);
          console.error(
            `❌ (attempt ${attempt}) ${programId} on ${index} after ${duration}s - ${err.message}`
          );
          freeInstance.busy = false;
          break; // retry loop
        }
      }

      await sleep(1000); // wait for a free instance
    }
  }

  // All retries failed
  permanentlyFailedIds.push(programId);
  console.error(`❌❌ Permanent failure: ${programId}`);
};

router.post("/", async (req, res) => {
  const total = programs.length;
  console.log(
    `🚀 Dispatching ${total} programs across ${INSTANCE_URLS.length} instances`
  );

  // Reset state
  doneIds.length = 0;
  mostFailedIds.length = 0;
  permanentlyFailedIds.length = 0;

  const allTasks = programs.map((program, index) => {
    const programId = program["Accreditation ID"];
    return processProgramWithRetry(programId, index, total);
  });

  await Promise.all(allTasks);

  res.json({
    success: true,
    message: "Dispatch complete",
    summary: {
      done: doneIds,
      mostFailed: mostFailedIds,
      permanentlyFailed: permanentlyFailedIds,
    },
  });
});

export default router;
