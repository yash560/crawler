import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const crawlProgramPages = async (id) => {
  const urls = [
    `https://freida.ama-assn.org/program/${id}/program-work-schedule`,
    `https://freida.ama-assn.org/program/${id}`,
    `https://freida.ama-assn.org/program/${id}/features-benefits`,
  ];

  console.log(`\n📄 Starting crawl for ID: ${id}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  let allTables = [];

  for (const url of urls) {
    console.log(`➡️ Visiting URL: ${url}`);
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: 1280,
        height: 800,
      });
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      console.log(`✅ Page loaded: ${url}`);

      // Extract tables
      console.log("   📋 Extracting tables...");
      const tables = await extractTables(page);
      console.log(`   ✅ Found ${tables?.length || 0} tables`);

      // Extract extra data
      console.log("   🧩 Extracting extra data...");
      const extraData = await extractExtraData(page);
      console.log(`   ✅ Found ${extraData?.length || 0} extra sections`);

      // Extract charts
      console.log("   📊 Extracting chart data...");
      const chartData = await extractFeatureChart(page);
      console.log(`   ✅ Found ${chartData?.length || 0} charts`);

      console.log("   📊 Extracting chart data...");
      const chartDatas = await extractProgramWorkCharts(page);
      console.log(`   ✅ Found ${chartDatas?.length || 0} charts`);

      // Push all
      allTables.push(
        ...(tables || []),
        ...(extraData || []),
        ...(chartData || []),
        ...(chartDatas || [])
      );
    } catch (err) {
      console.error(`❌ Error scraping ${url}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`🎯 Total extracted tables for ID ${id}: ${allTables.length}\n`);
  return allTables;
};

const extractTables = async (page) => {
  try {
    await page.waitForSelector("table", { timeout: 30000 }).catch(() => {});
    const hasTables = await page.$("table");
    if (!hasTables) return [];

    return await page.$$eval("table", (tables) =>
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
  } catch (err) {
    console.error("❌ extractTables error:", err.message);
    return [];
  }
};

const extractExtraData = async (page) => {
  try {
    return await page.evaluate(() => {
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
            rows.push([`${labelPrefix} Fax`, line.replace("Fax:", "").trim()]);
          else if (line.startsWith("E-mail:"))
            rows.push([
              `${labelPrefix} E-mail`,
              line.replace("E-mail:", "").trim(),
            ]);
          else if (!line.endsWith(":"))
            rows.push([`${labelPrefix} Detail`, line]);
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

        if (section.key === "programDirector") {
          caption = "Program Director";
          rows = extractContact(section.label, "Program Director");
        } else if (section.key === "contactPerson") {
          caption = "Contact Person";
          rows = extractContact(section.label, "Contact Person");
        } else if (section.key === "institutions") {
          caption = "Institutions & Locations";
          rows = extractInstitutions();
        }

        if (rows.length > 0) {
          results.push({ caption, rows });
        }
      }

      return results;
    });
  } catch (err) {
    console.error("❌ extractExtraData error:", err.message);
    return [];
  }
};

const extractFeatureChart = async (page) => {
  const chartIds = ["#chart", "#chart2"];
  const tables = [];

  for (const chartId of chartIds) {
    try {
      const chartHandle = await page.$(chartId);
      if (!chartHandle) continue;

      await page.waitForSelector(`${chartId} .apexcharts-datalabel`, {
        timeout: 5000,
      });

      const chartData = await page.evaluate((chartId) => {
        const chart = document.querySelector(chartId);
        if (!chart) return null;

        const caption =
          chart.querySelector(".apexcharts-title-text")?.textContent?.trim() ||
          "Chart";

        const yLabels = Array.from(
          chart.querySelectorAll(".apexcharts-yaxis-label")
        ).map((el) => el.textContent.split("\n")[0].trim());

        const dataLabels = Array.from(
          chart.querySelectorAll(".apexcharts-datalabel")
        ).map((el) => el.textContent.trim());

        const rows = [];
        const count = Math.min(yLabels.length, dataLabels.length);

        for (let i = 0; i < count; i++) {
          if (yLabels[i] && dataLabels[i])
            rows.push([yLabels[i], dataLabels[i]]);
        }

        return rows.length > 0 ? { caption, rows } : null;
      }, chartId);

      if (chartData) tables.push(chartData);
    } catch (err) {
      console.error(`❌ extractFeatureChart error (${chartId}):`, err.message);
    }
  }

  return tables;
};

const extractProgramWorkCharts = async (page) => {
  try {
    // Find chart container whose ID starts with "apexcharts"
    const chartID = await page.evaluate(() => {
      const chartEl = document.querySelector('[id^="apexcharts"]');
      return chartEl ? chartEl.id : null;
    });

    if (!chartID) {
      throw new Error(
        "Chart container with ID starting with 'apexcharts' not found."
      );
    }

    const chartSelector = `#${chartID}`;
    await page.waitForSelector(chartSelector, { timeout: 10000 });

    const data = await page.evaluate((chartID) => {
      const chartEl = document.querySelector(`#${chartID}`);
      if (!chartEl) return [];

      const yAxisLabels = Array.from(
        chartEl.querySelectorAll(".apexcharts-yaxis-label")
      ).map((el) => el.textContent.trim());

      const values = Array.from(
        chartEl.querySelectorAll(".apexcharts-datalabel")
      ).map((el) => parseInt(el.textContent.trim(), 10));

      return yAxisLabels.map((label, index) => ({
        year: label,
        positions: values[index] || 0,
      }));
    }, chartID);

    return data;
  } catch (err) {
    console.error("❌ extractProgramWorkCharts error:", err.message);
    return null;
  }
};
