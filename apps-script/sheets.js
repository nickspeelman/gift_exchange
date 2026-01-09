// apps-script/sheets.js

const Sheets = (() => {

  function getSpreadsheet_() {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("Missing Script Property: SPREADSHEET_ID");
    return SpreadsheetApp.openById(spreadsheetId);
  }

  function getSheet_(sheetName) {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Missing sheet tab: ${sheetName}`);
    return sheet;
  }

  /**
   * Reads row 1 headers and returns:
   * { headers: string[], headerToCol: { [header]: number } }
   */
  function getHeaderMap(sheetName) {
    const sheet = getSheet_(sheetName);
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) throw new Error(`Sheet '${sheetName}' has no columns.`);

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => String(h || "").trim());

    if (headers.every(h => !h)) {
      throw new Error(`Sheet '${sheetName}' has a blank header row.`);
    }

    const headerToCol = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h) continue;

      if (headerToCol[h]) {
        throw new Error(`Duplicate header '${h}' in '${sheetName}'.`);
      }
      headerToCol[h] = i + 1; // 1-based
    }

    return { headers, headerToCol };
  }

  /**
   * Appends a row by mapping rowObject keys to headers.
   * Unknown keys ignored. Missing keys -> blank cells.
   */
  function appendObjectRow(sheetName, rowObject) {
    const sheet = getSheet_(sheetName);
    const { headers } = getHeaderMap(sheetName);

    const row = headers.map((h) => {
      const val = rowObject[h];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return val;
    });

    sheet.appendRow(row);
    return { rowNumber: sheet.getLastRow(), writtenRow: row };
  }

  function findRowByValue(sheetName, headerName, value) {
    const sheet = getSheet_(sheetName);
    const { headerToCol, headers } = getHeaderMap(sheetName);

    const col = headerToCol[headerName];
    if (!col) throw new Error(`Unknown header '${headerName}' in '${sheetName}'.`);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null; // no data rows

    const range = sheet.getRange(2, col, lastRow - 1, 1);
    const values = range.getValues(); // [[...], ...]
    for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(value)) {
        return 2 + i; // actual row number in sheet
        }
    }
    return null;
    }

function getRowObject(sheetName, rowNumber) {
    const sheet = getSheet_(sheetName);
    const { headers } = getHeaderMap(sheetName);

    const rowValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (!h) continue;
        obj[h] = rowValues[i];
    }
    return obj;
    }

function getAllRowObjects(sheetName) {
  const sheet = getSheet_(sheetName);
  const { headers } = getHeaderMap(sheetName);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // no data rows

  const range = sheet.getRange(2, 1, lastRow - 1, headers.length);
  const values = range.getValues();

  const rows = [];
  for (let r = 0; r < values.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      obj[h] = values[r][c];
    }
    rows.push(obj);
  }
  return rows;
}


function setCellByHeader(sheetName, rowNumber, headerName, value) {
    const sheet = getSheet_(sheetName);
    const { headerToCol } = getHeaderMap(sheetName);

    const col = headerToCol[headerName];
    if (!col) throw new Error(`Unknown header '${headerName}' in '${sheetName}'.`);

    sheet.getRange(rowNumber, col).setValue(value);
}

return {
  getHeaderMap,
  appendObjectRow,
  findRowByValue,
  getRowObject,
  getAllRowObjects,
  setCellByHeader
};


})();