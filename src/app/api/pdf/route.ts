import { NextResponse } from "next/server";
import { z } from "zod";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { resumeToHtml } from "@/lib/pdf";
import type { ResumeData, TemplateId } from "@/types";

export const runtime = "nodejs";

const Body = z.object({
  resume_data: z.object({}).passthrough(),
  template: z.enum(["modern", "classic", "minimal", "executive", "creative"]).default("modern"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid PDF request" }, { status: 400 });

  const html = resumeToHtml((parsed.data.resume_data || {}) as Partial<ResumeData>, parsed.data.template as TemplateId);
  try {
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({ args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"], executablePath, headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=optimized-resume.pdf" } });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json({ message: "PDF generation failed. Download LaTeX and compile it, or retry." }, { status: 500 });
  }
}
