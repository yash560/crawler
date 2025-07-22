export const extractGroupedData = (data) => {
  const result = {};
  const tableNameCount = {};

  console.log("📦 Starting extractGroupedData...");
  const flatData = data.flatMap((item) =>
    Array.isArray(item) ? item : [item]
  );

  flatData.forEach((table, index) => {
    if (!table || !Array.isArray(table.rows)) {
      console.warn(
        `⚠️ Skipping table at index ${index}: Invalid or missing rows`
      );
      return;
    }

    // Normalize and clean table caption
    let rawName = table.caption || "Miscellaneous";
    let tableName = rawName
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[^a-zA-Z0-9 ]/g, "");
    tableName = tableName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    // Handle duplicate table names
    if (tableNameCount[tableName]) {
      tableNameCount[tableName]++;
      tableName = `${tableName}_${tableNameCount[tableName]}`;
    } else {
      tableNameCount[tableName] = 1;
    }

    console.log(`🔍 Processing table: ${rawName} ➜ ${tableName}`);

    const tableData = {};
    const keyCount = {};

    table.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length < 2) {
        console.warn(
          `   ⚠️ Skipping row ${rowIndex} in ${tableName}: Invalid or too short`
        );
        return;
      }

      // Normalize row key
      let key = row[0]
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^a-zA-Z0-9 ]/g, "");
      key = key
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");

      // Handle duplicate keys
      if (keyCount[key]) {
        keyCount[key]++;
        key = `${key}_${keyCount[key]}`;
      } else {
        keyCount[key] = 1;
      }

      // Assign value
      tableData[key] = row.length === 2 ? row[1] : row.slice(1);
    });

    result[tableName] = tableData;
  });

  console.log(
    `✅ extractGroupedData completed. Total tables: ${
      Object.keys(result).length
    }`
  );
  return result;
};
