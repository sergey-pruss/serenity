#!/usr/bin/env python3
"""
Извлечь URL и тип проблемы из экспорта GSC «Покрытие» (drilldown .xlsx).
Лист sheet2: колонка A — URL; sheet3: строка «Проблема» — текст причины.

Использование:
  python3 scripts/seo/gsc-drilldown-xlsx-to-tsv.py файл1.xlsx файл2.xlsx … > urls.tsv

TSV: issue \\t url (для последующего npm run seo:gsc-url-triage)
"""
from __future__ import annotations

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_shared_strings(z: zipfile.ZipFile) -> list[str]:
    raw = z.read("xl/sharedStrings.xml")
    root = ET.fromstring(raw)
    out: list[str] = []
    for si in root.findall(".//m:si", NS):
        texts: list[str] = []
        for t in si.findall(".//m:t", NS):
            if t.text:
                texts.append(t.text)
        out.append("".join(texts))
    return out


def cell_value(c: ET.Element, ss: list[str]) -> str:
    t = c.get("t")
    v = c.find("m:v", NS)
    if v is not None and v.text is not None:
        if t == "s":
            return ss[int(v.text)]
        return v.text
    is_el = c.find("m:is", NS)
    if is_el is not None:
        tnodes = is_el.findall(".//m:t", NS)
        return "".join((t.text or "") for t in tnodes)
    return ""


def col_row(ref: str) -> tuple[int, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", ref)
    if not m:
        return 0, 0
    letters, row_s = m.group(1), m.group(2)
    row = int(row_s)
    col = 0
    for ch in letters:
        col = col * 26 + (ord(ch) - ord("A") + 1)
    return col, row


def sheet_grid(z: zipfile.ZipFile, sheet: str, ss: list[str]) -> dict[tuple[int, int], str]:
    root = ET.fromstring(z.read(sheet))
    grid: dict[tuple[int, int], str] = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        for c in row.findall("m:c", NS):
            ref = c.get("r", "")
            if not ref:
                continue
            col, r = col_row(ref)
            grid[(r, col)] = cell_value(c, ss)
    return grid


def issue_from_sheet3(grid: dict[tuple[int, int], str]) -> str:
    for (r, c), v in grid.items():
        if c == 1 and v == "Проблема":
            return grid.get((r, 2), "?")
    return "?"


def urls_from_sheet2(grid: dict[tuple[int, int], str]) -> list[str]:
    urls: list[str] = []
    for (r, c), v in sorted(grid.items()):
        if c == 1 and r > 1 and str(v).startswith("http"):
            urls.append(str(v).strip())
    return urls


def process_one(path: Path) -> tuple[str, list[str]]:
    with zipfile.ZipFile(path) as z:
        ss = read_shared_strings(z)
        g2 = sheet_grid(z, "xl/worksheets/sheet2.xml", ss)
        g3 = sheet_grid(z, "xl/worksheets/sheet3.xml", ss)
    return issue_from_sheet3(g3), urls_from_sheet2(g2)


def main() -> None:
    paths = [Path(a) for a in sys.argv[1:] if a.endswith(".xlsx")]
    if not paths:
        print("Укажите хотя бы один .xlsx", file=sys.stderr)
        sys.exit(1)
    for p in paths:
        if not p.exists():
            print("Нет файла:", p, file=sys.stderr)
            sys.exit(1)
    print("issue\turl")
    for p in paths:
        issue, urls = process_one(p)
        for u in urls:
            safe_issue = issue.replace("\t", " ").replace("\n", " ")
            print(f"{safe_issue}\t{u}")


if __name__ == "__main__":
    main()
