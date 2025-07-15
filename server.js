import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json());

app.get("/crawl", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL in query parameters" });
  }

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    const tables = await page.$$eval("table", (tables) =>
      tables.map((table) => {
        const caption =
          table.querySelector("caption")?.innerText.trim() || null;
        const rows = Array.from(table.querySelectorAll("tr")).map((tr) => {
          return Array.from(tr.querySelectorAll("td, th")).map((td) =>
            td.textContent.trim()
          );
        });
        return { caption, rows };
      })
    );

    await browser.close();
    res.json({ success: true, tables });
  } catch (err) {
    console.error("Crawler error:", err);
    if (browser) await browser.close();
    res
      .status(500)
      .json({ error: "Failed to extract tables", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Crawler server running on port ${PORT}`);
});
