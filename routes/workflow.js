import express from "express";
import { crawlProgramPages } from "../utils/crawler.js";
import { extractGroupedData } from "../utils/dataGrouper.js";
import { fetchGeminiData } from "../utils/gemini.js";
import { postFinalData } from "../utils/submitData.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const id = req.body.id;
  if (!id) return res.status(400).json({ error: "Missing ID" });

  const start = Date.now(); // Record start time

  try {
    const crawledData = await crawlProgramPages(id);
    console.log("Data Crawled:", crawledData.length, "tables");

    const groupedData = extractGroupedData(crawledData);
    const geminiData = await fetchGeminiData(id);

    const final = { id, ...geminiData, ...groupedData };

    await postFinalData(final);

    const end = Date.now(); // Record end time
    const duration = ((end - start) / 1000).toFixed(2); // in seconds

    console.log(`ID ${id} processed in ${duration}s`);

    res.json({ success: true, timeTakenInSeconds: duration, final });
  } catch (err) {
    console.error("Freida Error:", err.message);
    res
      .status(500)
      .json({ error: "Something went wrong", details: err.message });
  }
});

export default router;
