import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const crawlProgramPages = async (id) => {
  const urls = [
    `https://freida.ama-assn.org/program/${id}/program-work-schedule`,
    `https://freida.ama-assn.org/program/${id}`,
    `https://freida.ama-assn.org/program/${id}/features-benefits`,
  ];

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
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 180000 });

    // Extract tables, extraData, and charts from the page
    const tables = await extractTables(page);
    const extraData = await extractExtraData(page);
    const chartData = await extractCharts(page);

    allTables.push(
      ...(tables || []),
      ...(extraData || []),
      ...(chartData || [])
    );

    await page.close();
  }

  await browser.close();
  return allTables;
};

const extractTables = async (page) => {
  await page.waitForSelector("table", { timeout: 30000 }).catch(() => {});
  const hasTables = await page.$("table");
  if (!hasTables) return [];

  return await page.$$eval("table", (tables) =>
    tables.map((table) => {
      const caption = table.querySelector("caption")?.innerText.trim() || null;
      const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td, th")).map((td) =>
          td.textContent.trim()
        )
      );
      return { caption, rows };
    })
  );
};

const extractExtraData = async (page) => {
  return await page.evaluate(() => {
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
    } catch {
      return [];
    }
  });
};

const extractCharts = async (page) => {
  const chartIds = ["#chart", "#chart2"];
  const tables = [];

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
    } catch {}
  }

  return tables;
};
