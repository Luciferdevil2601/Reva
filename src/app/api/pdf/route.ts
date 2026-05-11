import { NextResponse } from "next/server";
import { z } from "zod";
import type { ResumeData } from "@/types";

export const runtime = "nodejs";

const Body = z.object({
  resume_data: z.object({}).passthrough(),
  template: z.enum(["modern", "classic", "minimal", "executive", "creative"]).default("modern"),
});

function esc(value: unknown) {
  return String(value || "").replace(/[\\()]/g, "\\$&").replace(/\r?\n/g, " ");
}

function linesForResume(data: Partial<ResumeData>) {
  const contact = data.contact || { name: "Your Name", email: "", phone: "", linkedin: "", location: "" };
  const lines = [
    String(contact.name || "Your Name"),
    [contact.email, contact.phone, contact.linkedin, contact.location].filter(Boolean).join(" | "),
    "",
    "PROFESSIONAL SUMMARY",
    data.summary || "",
    "",
    "EXPERIENCE",
  ];
  for (const exp of data.experience || []) {
    lines.push(`${exp.title || ""} - ${exp.company || ""} ${exp.dates ? `(${exp.dates})` : ""}`.trim());
    for (const bullet of exp.bullets || []) lines.push(`- ${bullet}`);
  }
  lines.push("", "SKILLS", (data.skills || []).join(", "), "", "EDUCATION");
  for (const edu of data.education || []) lines.push(`${edu.degree || ""} - ${edu.school || ""} ${edu.year ? `(${edu.year})` : ""}`.trim());
  if (data.certifications?.length) lines.push("", "CERTIFICATIONS", data.certifications.join(", "));
  return lines.flatMap((line) => {
    const text = String(line || "");
    if (text.length <= 92) return [text];
    const chunks: string[] = [];
    for (let index = 0; index < text.length; index += 92) chunks.push(text.slice(index, index + 92));
    return chunks;
  });
}

function makePdf(data: Partial<ResumeData>) {
  const content = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"];
  linesForResume(data).slice(0, 52).forEach((line, index) => {
    if (index === 0) content.push("/F1 20 Tf", `(${esc(line)}) Tj`, "/F1 11 Tf", "T*");
    else content.push(`(${esc(line)}) Tj`, "T*");
  });
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += object;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid PDF request" }, { status: 400 });
  const pdf = makePdf((parsed.data.resume_data || {}) as Partial<ResumeData>);
  return new NextResponse(pdf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=optimized-resume.pdf" },
  });
}
