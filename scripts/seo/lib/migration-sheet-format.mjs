import {
  MIGRATION_COL_SERP_START,
  MIGRATION_COL_TZ_LINK,
} from "./migration-sheet-data.mjs";

/**
 * @param {import('./migration-sheet-layout.mjs').MigrationColumnMap} [colMap]
 */
/** Светло-зелёный фон для «новый» (#d9ead3). */
const CONTOUR_NEW_BG = { red: 217 / 255, green: 234 / 255, blue: 211 / 255 };

function resolveFormatColumns(colMap) {
  return {
    pageCol: colMap?.page ?? 0,
    contourCol: colMap?.contour ?? 2,
    tzLinkCol: colMap?.tzLink ?? MIGRATION_COL_TZ_LINK,
    serpStart:
      colMap?.serpGoogle ??
      (MIGRATION_COL_SERP_START >= 0 ? MIGRATION_COL_SERP_START : 8),
    serpEnd: Math.max(
      (colMap?.serpGoogle ?? MIGRATION_COL_SERP_START) + 1,
      (colMap?.serpYandexMsk ?? MIGRATION_COL_SERP_START + 1) + 1,
      (colMap?.serpYandexSpb ?? MIGRATION_COL_SERP_START + 2) + 1,
      MIGRATION_COL_SERP_START + 3,
    ),
  };
}

/**
 * Единое оформление листа после записи данных (шрифт 10, жирный только шапка).
 * Колонки страниц и ТЗ (HYPERLINK) — без принудительного textFormat.
 * @param {import('googleapis').sheets_v4.Sheets} sheets
 * @param {string} spreadsheetId
 * @param {number} sheetId
 * @param {number} rowCount
 * @param {number} colCount
 * @param {import('./migration-sheet-layout.mjs').MigrationColumnMap} [colMap]
 */
export async function applyMigrationSheetFormatting(
  sheets,
  spreadsheetId,
  sheetId,
  rowCount,
  colCount,
  colMap,
) {
  const { pageCol, contourCol, tzLinkCol, serpStart, serpEnd } =
    resolveFormatColumns(colMap);
  const font = { fontSize: 10, fontFamily: "Arial" };
  const headerBg = { red: 0.93, green: 0.94, blue: 0.96 };

  /** @type {import('googleapis').sheets_v4.Schema$Request[]} */
  const requests = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: 1,
          endColumnIndex: tzLinkCol,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { ...font, bold: false },
            verticalAlignment: "TOP",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: tzLinkCol + 1,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { ...font, bold: false },
            verticalAlignment: "TOP",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { ...font, bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            backgroundColor: headerBg,
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColor,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: pageCol,
          endColumnIndex: pageCol + 1,
        },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "MIDDLE",
            wrapStrategy: "CLIP",
          },
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: serpStart,
          endColumnIndex: serpEnd,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            textFormat: { ...font, bold: false },
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: tzLinkCol,
          endColumnIndex: tzLinkCol + 1,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: "CLIP",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: tzLinkCol,
          endColumnIndex: tzLinkCol + 1,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: "CLIP",
          },
        },
        fields: "userEnteredFormat(wrapStrategy)",
      },
    },
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: rowCount,
              startColumnIndex: contourCol,
              endColumnIndex: contourCol + 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: "новый" }],
            },
            format: {
              backgroundColor: CONTOUR_NEW_BG,
            },
          },
        },
        index: 0,
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/** @param {number} n 1-based */
export function columnLetter(n) {
  let s = "";
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
