import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Resume file is required" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "Resume must be 5MB or smaller" }, { status: 400 });

    const name = file.name.toLowerCase();
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      try {
        const parsed = await parser.getText();
        text = parsed.text;
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith(".docx")) {
      const parsed = await mammoth.extractRawText({ buffer: bytes });
      text = parsed.value;
    } else if (name.endsWith(".txt")) {
      text = bytes.toString("utf8");
    } else {
      return NextResponse.json({ message: "Upload PDF, DOCX, or TXT resume" }, { status: 400 });
    }
    const clean = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) return NextResponse.json({ message: "Could not read text from this resume. Try DOCX or TXT if the PDF is scanned." }, { status: 400 });
    return NextResponse.json({ text: clean, filename: file.name, size: file.size });
  } catch (error) {
    console.error("Resume parse failed", error);
    return NextResponse.json({ message: "Could not parse this resume. Try uploading DOCX or TXT." }, { status: 500 });
  }
}
