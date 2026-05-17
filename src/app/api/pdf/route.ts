import { NextResponse } from "next/server";
import { z } from "zod";
import type { ResumeData } from "@/types";

export const runtime = "nodejs";

const Body = z.object({
  resume_data: z.object({}).passthrough(),
  template: z.enum(["modern", "classic", "minimal", "executive", "creative"]).default("modern"),
});

const PAGE_W = 595;
const PAGE_H = 842;
const LEFT = 48;
const RIGHT = 48;
const WIDTH = PAGE_W - LEFT - RIGHT;

function clean(value: unknown) {
  return String(value || "")
    .replace(/[•○●]/g, "-")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(value: unknown) {
  return clean(value).replace(/[\\()]/g, "\\$&");
}

function wrap(text: unknown, maxChars: number) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textAt(x: number, y: number, text: unknown, size = 10, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`;
}

function line(x1: number, y1: number, x2: number, y2 = y1) {
  return `${x1} ${y1} m ${x2} ${y2} l S`;
}

function section(ops: string[], y: number, title: string) {
  ops.push(textAt(LEFT, y, title.toUpperCase(), 9, "F2"));
  ops.push(line(LEFT, y - 5, PAGE_W - RIGHT, y - 5));
  return y - 18;
}

function drawWrapped(ops: string[], x: number, y: number, text: unknown, maxChars: number, size = 9, leading = 12) {
  for (const row of wrap(text, maxChars)) {
    ops.push(textAt(x, y, row, size));
    y -= leading;
  }
  return y;
}

function skillsRows(skills: string[]) {
  const cleanSkills = skills.map(clean).filter(Boolean).slice(0, 18);
  return [
    ["Core", cleanSkills.slice(0, 6).join(", ")],
    ["Technical", cleanSkills.slice(6, 12).join(", ")],
    ["Professional", cleanSkills.slice(12, 18).join(", ")],
  ].filter(([, value]) => value);
}

function makePdf(data: Partial<ResumeData>) {
  const contact = data.contact || { name: "Your Name", email: "", phone: "", linkedin: "", location: "" };
  const ops = ["0.08 0.20 0.35 RG", "0.08 0.20 0.35 rg", "1 w"];
  let y = 795;

  ops.push(textAt(LEFT, y, contact.name || "Your Name", 22, "F2"));
  y -= 17;
  if (data.experience?.[0]?.title) {
    ops.push(textAt(LEFT, y, data.experience[0].title, 11, "F2"));
    y -= 14;
  }
  const contactLine = [contact.location, contact.phone, contact.email, contact.linkedin].filter(Boolean).join(" | ");
  y = drawWrapped(ops, LEFT, y, contactLine, 96, 9, 11) - 6;

  y = section(ops, y, "Professional Summary");
  y = drawWrapped(ops, LEFT, y, data.summary || "", 102, 9, 12) - 6;

  if (data.skills?.length) {
    y = section(ops, y, "Core Skills");
    for (const [label, value] of skillsRows(data.skills)) {
      ops.push(textAt(LEFT, y, label, 9, "F2"));
      y = drawWrapped(ops, LEFT + 96, y, value, 78, 9, 12);
      y -= 2;
    }
    y -= 4;
  }

  if (data.experience?.length) {
    y = section(ops, y, "Experience");
    for (const exp of data.experience.slice(0, 3)) {
      const dates = clean(exp.dates);
      if (dates) ops.push(textAt(LEFT, y, dates, 9, "F2"));
      ops.push(textAt(LEFT + 96, y, `${exp.title}${exp.company ? `, ${exp.company}` : ""}${exp.location ? `, ${exp.location}` : ""}`, 9, "F2"));
      y -= 13;
      for (const bullet of (exp.bullets || []).slice(0, 5)) {
        ops.push(textAt(LEFT + 106, y, "-", 9, "F2"));
        y = drawWrapped(ops, LEFT + 118, y, bullet, 76, 9, 12);
      }
      y -= 4;
    }
  }

  if (data.education?.length) {
    y = section(ops, y, "Education");
    for (const edu of data.education.slice(0, 3)) {
      const row = `${edu.degree}${edu.school ? `, ${edu.school}` : ""}${edu.gpa ? `, ${edu.gpa}` : ""}`;
      ops.push(textAt(LEFT, y, edu.year || "", 9, "F2"));
      y = drawWrapped(ops, LEFT + 96, y, row, 78, 9, 12) - 2;
    }
  }

  if (data.certifications?.length && y > 90) {
    y = section(ops, y, "Certifications");
    y = drawWrapped(ops, LEFT, y, data.certifications.join(" | "), 102, 9, 12);
  }

  const stream = ops.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
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
