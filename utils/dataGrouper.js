export const extractGroupedData = (data) => {
  let result = {};
  let tableNameCount = {};

  const flatData = data.flatMap(item => Array.isArray(item) ? item : [item]);

  flatData.forEach((table) => {
    if (!table || !Array.isArray(table.rows)) return;

    let rawName = table.caption || 'Miscellaneous';
    let tableName = rawName.replace(/\s+/g, ' ').trim().replace(/[^a-zA-Z0-9 ]/g, '');
    tableName = tableName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    if (tableNameCount[tableName]) {
      tableNameCount[tableName]++;
      tableName = `${tableName}_${tableNameCount[tableName]}`;
    } else {
      tableNameCount[tableName] = 1;
    }

    const tableData = {};
    const keyCount = {};

    table.rows.forEach(row => {
      if (!Array.isArray(row) || row.length < 2) return;

      let key = row[0].replace(/\s+/g, ' ').trim().replace(/[^a-zA-Z0-9 ]/g, '');
      key = key.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

      if (keyCount[key]) {
        keyCount[key]++;
        key = `${key}_${keyCount[key]}`;
      } else {
        keyCount[key] = 1;
      }

      tableData[key] = row.length === 2 ? row[1] : row.slice(1);
    });

    result[tableName] = tableData;
  });

  return result;
};
