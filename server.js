import express from "express";
import { chromium as baseChromium } from "playwright-extra";
import StealthPlugin from "playwright-extra-plugin-stealth";

const app = express();
app.use(express.json());

// Apply stealth plugin
baseChromium.use(StealthPlugin());

app.get("/crawl", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL in query parameters" });
  }

  let browser;
  try {
    browser = await baseChromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Spoof user agent and viewport
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    await page.waitForSelector("table", { timeout: 20000 });

    const tables = await page.$$eval("table", (tables) =>
      tables.map((table) => {
        const caption =
          table.querySelector("caption")?.innerText.trim() || null;
        const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
          Array.from(tr.querySelectorAll("td, th")).map((td) =>
            td.textContent.trim()
          )
        );
        return { caption, rows };
      })
    );

    await browser.close();
    res.json({ success: true, tables });
  } catch (err) {
    console.error("Crawler error:", err);
    if (browser) await browser.close();

    res.status(500).json({
      error: "Failed to extract tables",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Crawler server running on port ${PORT}`);
});
