import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const router = express.Router();
puppeteer.use(StealthPlugin());

router.get("/freida", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920x1080",
      ],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 180000 });

    let tables = [];
    await page.waitForSelector("table", { timeout: 30000 });

    const hasTables = await page.$("table");
    if (hasTables) {
      tables = await page.$$eval("table", (tables) =>
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
    }

    const extraData = await page.evaluate(() => {
      try {
        const sections = [
          { key: "programDirector", label: "Program Director:" },
          {
            key: "contactPerson",
            label: "Person to contact for more information about the program:",
          },
          { key: "institutions", label: "Institutions & Locations" },
        ];

        const results = [];

        const extractContact = (labelText, labelPrefix) => {
          const containers = Array.from(
            document.querySelectorAll(".contact-info__contacts")
          );
          const matched = containers.find((el) =>
            el.innerText.includes(labelText)
          );
          if (!matched) return [];

          const lines = matched.innerText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);

          const rows = [];

          for (let line of lines) {
            if (line.startsWith("Tel:"))
              rows.push([
                `${labelPrefix} Phone`,
                line.replace("Tel:", "").trim(),
              ]);
            else if (line.startsWith("Fax:"))
              rows.push([
                `${labelPrefix} Fax`,
                line.replace("Fax:", "").trim(),
              ]);
            else if (line.startsWith("E-mail:"))
              rows.push([
                `${labelPrefix} E-mail`,
                line.replace("E-mail:", "").trim(),
              ]);
            else if (!line.endsWith(":")) {
              rows.push([`${labelPrefix} Detail`, line]);
            }
          }

          return rows;
        };

        const extractInstitutions = () => {
          const rows = [];
          const section = document.querySelector(".institutions");
          if (!section) return rows;

          const items = section.querySelectorAll(".institutions__location");
          items.forEach((item) => {
            const heading =
              item.querySelector(".institutions__heading")?.innerText.trim() ||
              "Institution";
            const value = item.querySelector("p")?.innerText.trim() || "";
            rows.push([heading, value.replace(/\n/g, ", ")]);
          });

          return rows;
        };

        for (const section of sections) {
          let caption = "";
          let rows = [];

          switch (section.key) {
            case "programDirector":
              caption = "Program Director";
              rows = extractContact(section.label, "Program Director");
              break;

            case "contactPerson":
              caption = "Contact Person";
              rows = extractContact(section.label, "Contact Person");
              break;

            case "institutions":
              caption = "Institutions & Locations";
              rows = extractInstitutions();
              break;

            default:
              break;
          }

          if (rows.length > 0) {
            results.push({ caption, rows });
          }
        }

        return results;
      } catch (e) {
        return [];
      }
    });

    async function extractAllCharts(page) {
      const tables = [];
      const chartIds = ["#chart", "#chart2"];

      for (const chartId of chartIds) {
        const chartHandle = await page.$(chartId);
        if (!chartHandle) continue;

        try {
          await page.waitForSelector(`${chartId} .apexcharts-datalabel`, {
            timeout: 5000,
          });

          const chartData = await page.evaluate((chartId) => {
            const chart = document.querySelector(chartId);
            if (!chart) return null;

            const caption =
              chart
                .querySelector(".apexcharts-title-text")
                ?.textContent?.trim() || "Chart";

            const yLabels = Array.from(
              chart.querySelectorAll(".apexcharts-yaxis-label")
            ).map((el) => el.textContent.split("\n")[0].trim());

            const dataLabels = Array.from(
              chart.querySelectorAll(".apexcharts-datalabel")
            ).map((el) => el.textContent.trim());

            const rows = [];
            const count = Math.min(yLabels.length, dataLabels.length);

            for (let i = 0; i < count; i++) {
              const y = yLabels[i];
              const d = dataLabels[i];
              if (y && d) rows.push([y, d]);
            }

            return rows.length > 0 ? { caption, rows } : null;
          }, chartId);

          if (chartData) {
            const duplicate = tables.find(
              (t) => t.caption === chartData.caption
            );
            if (!duplicate) tables.push(chartData);
          }
        } catch (e) {
          console.log(`Chart read error at ${chartId}:`, e.message);
        }
      }

      return tables;
    }

    const chartData = await extractAllCharts(page);
    if (chartData) tables.push(...chartData);

    const finalData = [...(tables || []), ...(extraData || [])];

    await browser.close();
    res.json({ success: true, tables: finalData });
  } catch (err) {
    console.error("Crawler error:", err);
    if (browser) await browser.close();
    res.status(500).json({
      error: "Failed to extract data",
      details: err.message,
    });
  }
});

export default router;
