import express from "express";
import programs from "../payload/programs2.json" assert { type: "json" };
import axios from "axios";

const router = express.Router();

// Sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post("/upload", async (req, res) => {
  try {
    const total = programs.length;

    for (let i = 0; i < total; i++) {
      const program = programs[i];
      const startTime = Date.now();
      const programId = program["Accreditation ID"];

      console.log(
        `[${new Date().toISOString()}] (${
          i + 1
        }/${total}) ⏳ Sending request for ID: ${programId}`
      );

      try {
        const apiRes = await axios.post(
          "https://agents.thewebvale.com/webhook/f244cfe2-fc04-4900-a70e-84d1a5086c83",
          { id: programId }
        );
        console.log(apiRes);
        console.log(
          `[${new Date().toISOString()}] ✅ Success for ID: ${programId} in ${
            Date.now() - startTime
          }ms`
        );
      } catch (err) {
        console.log(
          `[${new Date().toISOString()}] ❌ Failed for ID: ${programId} in ${
            Date.now() - startTime
          }ms - ${err.message}`
        );
      }

      if (i < total - 1) {
        console.log(
          `[${new Date().toISOString()}] (${
            i + 1
          }/${total}) ⏳ Waiting 3.2 minutes before next...`
        );
        await sleep(3.2 * 60 * 1000); // 192,000 ms = 3.2 minutes
      }
    }

    res.json({ message: "All requests sent with delay" });
  } catch (err) {
    res.status(500).json({
      error: "Unexpected error",
      details: err.message,
    });
  }
});

export default router;
