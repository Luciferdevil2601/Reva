import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as typeof import("pdf-parse");
const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function decodePdfString(value: string) {
  const escaped: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
  return value
    .replace(/\\([nrtbf()\\])/g, (_, char: string) => escaped[char] || char)
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function extractTextFromPdfStream(stream: string) {
  const parts: string[] = [];
  for (const match of stream.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    parts.push(decodePdfString(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }
  for (const match of stream.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const line = Array.from(match[1].matchAll(/\((?:\\.|[^\\)])*\)/g))
      .map((part) => decodePdfString(part[0].slice(1, -1)))
      .join("");
    if (line) parts.push(line);
  }
  for (const match of stream.matchAll(/<([0-9a-fA-F\s]+)>\s*Tj/g)) {
    const hex = match[1].replace(/\s+/g, "");
    const chars = hex.match(/.{1,4}/g)?.map((chunk) => String.fromCharCode(parseInt(chunk, 16))).join("") || "";
    if (chars) parts.push(chars);
  }
  return parts.join("\n");
}

async function parsePdf(bytes: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const parsed = await parser.getText();
    const text = parsed.text || "";
    if (text.trim()) return text;
  } finally {
    await parser.destroy();
  }
  return parsePdfInSubprocess(bytes);
}

async function parsePdfInSubprocess(bytes: Buffer) {
  const tmp = path.join(os.tmpdir(), `reva-${randomUUID()}.pdf`);
  await fs.writeFile(tmp, bytes);
  const script = `
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
(async () => {
  const parser = new PDFParse({ data: fs.readFileSync(process.argv[1]) });
  try {
    const result = await parser.getText();
    process.stdout.write(result.text || "");
  } finally {
    await parser.destroy();
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
`;
  try {
    const { stdout } = await execFileAsync(process.execPath, ["-e", script, tmp], {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
    });
    return stdout;
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Resume file is required", 400);
    if (file.size === 0) return jsonError("Resume file is empty", 400);
    if (file.size > 5 * 1024 * 1024) return jsonError("Resume must be 5MB or smaller", 400);

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (name.endsWith(".pdf") || type === "application/pdf") {
      text = await parsePdf(bytes);
    } else if (
      name.endsWith(".docx") ||
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const parsed = await mammoth.extractRawText({ buffer: bytes });
      text = parsed.value;
    } else if (name.endsWith(".txt") || type.startsWith("text/")) {
      text = bytes.toString("utf8");
    } else {
      return jsonError("Upload PDF, DOCX, or TXT resume", 400);
    }
    const clean = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) return jsonError("Could not read text from this resume. Try DOCX or TXT if the PDF is scanned.", 400);
    return NextResponse.json({ text: clean, filename: file.name, size: file.size });
  } catch (error) {
    console.error("Resume parse failed", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("password")) return jsonError("This PDF is password protected. Please upload an unlocked PDF, DOCX, or TXT.", 400);
    if (message.includes("invalid pdf") || message.includes("bad pdf") || message.includes("format")) {
      return jsonError("This PDF appears to be invalid or corrupted. Please export it again, or upload DOCX/TXT.", 400);
    }
    return jsonError("Could not parse this resume. Try uploading DOCX or TXT.", 500);
  }
}
