import express from "express";
import { crawlProgramPages } from "../utils/crawler.js";
import { extractGroupedData } from "../utils/dataGrouper.js";
import { fetchGeminiData } from "../utils/gemini.js";
import { postFinalData } from "../utils/submitData.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const id = req.body.id;
  if (!id) return res.status(400).json({ error: "Missing ID" });

  const startTime = Date.now();
  let crawledData, groupedData, geminiData;

  console.log(`\n--- Processing ID: ${id} ---`);

  try {
    // Step 1: Crawl program pages
    console.log("[1] Crawling pages...");
    const crawlStart = Date.now();

    crawledData = await crawlProgramPages(id);

    console.log(
      `[1] ✅ Crawled ${crawledData.length} tables in ${
        (Date.now() - crawlStart) / 1000
      }s`
    );
  } catch (err) {
    console.error(`[1] ❌ Error while crawling: ${err.message}`);
    return res
      .status(502)
      .json({ error: "Failed to crawl program pages", details: err.message });
  }

  try {
    // Step 2: Group the data
    console.log("[2] Grouping data...");
    groupedData = extractGroupedData(crawledData);
    console.log("[2] ✅ Grouping complete");
  } catch (err) {
    console.error(`[2] ❌ Error in data grouping: ${err.message}`);
    return res
      .status(500)
      .json({ error: "Failed to group crawled data", details: err.message });
  }

  try {
    // Step 3: Fetch Gemini AI data
    console.log("[3] Fetching Gemini data...");
    geminiData = await fetchGeminiData(id);
    console.log("[3] ✅ Gemini data fetched");
  } catch (err) {
    console.error(`[3] ❌ Error in Gemini fetch: ${err.message}`);
    return res
      .status(500)
      .json({ error: "Failed to fetch Gemini data", details: err.message });
  }

  const final = { id, ...geminiData, ...groupedData };

  try {
    // Step 4: Submit the final data
    console.log("[4] Submitting final data...");
    await postFinalData(final);
    console.log("[4] ✅ Final data submitted");
  } catch (err) {
    console.error(`[4] ❌ Failed to submit final data: ${err.message}`);
    return res
      .status(500)
      .json({ error: "Failed to submit final data", details: err.message });
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ ID ${id} processed successfully in ${totalTime}s\n`);

  res.json({
    success: true,
    timeTakenInSeconds: totalTime,
    final,
  });
});

export default router;
