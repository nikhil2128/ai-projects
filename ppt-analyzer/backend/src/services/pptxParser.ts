import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { SlideContent } from "../types/index.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

function findAllTextNodes(node: unknown): string[] {
  const results: string[] = [];

  function walk(current: unknown): void {
    if (current === null || current === undefined) return;

    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    if (typeof current === "object") {
      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        if (key === "t" && (typeof value === "string" || typeof value === "number")) {
          results.push(String(value));
        } else if (key === "t" && Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === "string" || typeof item === "number") {
              results.push(String(item));
            }
          }
        } else {
          walk(value);
        }
      }
    }
  }

  walk(node);
  return results;
}

function extractTitle(slideObj: unknown): string {
  const shapes = getShapes(slideObj);

  for (const shape of shapes) {
    const nvSpPr = (shape as Record<string, unknown>)?.["nvSpPr"] as Record<string, unknown> | undefined;
    const nvPr = nvSpPr?.["nvPr"] as Record<string, unknown> | undefined;
    const ph = nvPr?.["ph"] as Record<string, unknown> | undefined;
    const phType = ph?.["@_type"] as string | undefined;

    if (phType === "title" || phType === "ctrTitle") {
      const txBody = (shape as Record<string, unknown>)?.["txBody"];
      const texts = findAllTextNodes(txBody);
      if (texts.length > 0) return texts.join(" ");
    }
  }

  return "";
}

function getShapes(slideObj: unknown): unknown[] {
  const sld = (slideObj as Record<string, unknown>)?.["sld"] as Record<string, unknown> | undefined;
  const cSld = sld?.["cSld"] as Record<string, unknown> | undefined;
  const spTree = cSld?.["spTree"] as Record<string, unknown> | undefined;
  const sp = spTree?.["sp"];

  if (!sp) return [];
  return Array.isArray(sp) ? sp : [sp];
}

function extractTableData(slideObj: unknown): string[][] | undefined {
  const tables: string[][] = [];

  function findTables(node: unknown): void {
    if (node === null || node === undefined) return;

    if (Array.isArray(node)) {
      node.forEach(findTables);
      return;
    }

    if (typeof node === "object") {
      const record = node as Record<string, unknown>;

      if ("tbl" in record) {
        const tbl = record["tbl"] as Record<string, unknown>;
        const rows = tbl?.["tr"];
        const rowArray = Array.isArray(rows) ? rows : rows ? [rows] : [];

        for (const row of rowArray) {
          const cells = (row as Record<string, unknown>)?.["tc"];
          const cellArray = Array.isArray(cells) ? cells : cells ? [cells] : [];
          const rowData: string[] = [];

          for (const cell of cellArray) {
            const texts = findAllTextNodes(cell);
            rowData.push(texts.join(" "));
          }

          if (rowData.length > 0) tables.push(rowData);
        }
        return;
      }

      for (const value of Object.values(record)) {
        findTables(value);
      }
    }
  }

  findTables(slideObj);
  return tables.length > 0 ? tables : undefined;
}

export async function parsePptx(buffer: Buffer): Promise<SlideContent[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slides: SlideContent[] = [];

  const slideEntries: { name: string; index: number }[] = [];
  zip.forEach((path, _entry) => {
    const match = path.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match?.[1]) {
      slideEntries.push({ name: path, index: parseInt(match[1], 10) });
    }
  });

  slideEntries.sort((a, b) => a.index - b.index);

  for (const entry of slideEntries) {
    const file = zip.file(entry.name);
    if (!file) continue;

    const xml = await file.async("text");
    const slideObj = parser.parse(xml);

    const title = extractTitle(slideObj);
    const allTexts = findAllTextNodes(slideObj);
    const tableData = extractTableData(slideObj);

    let notes: string | undefined;
    const notesFile = zip.file(`ppt/notesSlides/notesSlide${entry.index}.xml`);
    if (notesFile) {
      const notesXml = await notesFile.async("text");
      const notesObj = parser.parse(notesXml);
      const noteTexts = findAllTextNodes(notesObj);
      const filtered = noteTexts.filter((t) => t.trim().length > 0);
      if (filtered.length > 0) notes = filtered.join(" ");
    }

    slides.push({
      slideNumber: entry.index,
      title: title || `Slide ${entry.index}`,
      textContent: allTexts.filter((t) => t.trim().length > 0),
      hasTable: !!tableData,
      tableData,
      notes,
    });
  }

  return slides;
}
