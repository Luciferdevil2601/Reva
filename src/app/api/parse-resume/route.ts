import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Resume file is required" }, { status: 400 });
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    const parsed = await parser.getText();
    await parser.destroy();
    text = parsed.text;
  } else if (name.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    text = parsed.value;
  } else if (name.endsWith(".txt")) {
    text = bytes.toString("utf8");
  } else {
    return NextResponse.json({ message: "Upload PDF, DOCX, or TXT resume" }, { status: 400 });
  }
  const clean = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return NextResponse.json({ message: "Could not read text from this resume" }, { status: 400 });
  return NextResponse.json({ text: clean, filename: file.name, size: file.size });
}
