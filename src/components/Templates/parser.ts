import type { ResumeData } from "@/types";

function clean(line: string) {
  return line
    .replace(/[\u2022\u25cb\u25cf]/g, "-")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/^(mobile-alt|envelope|linkedin-in|phone|email)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function section(lines: string[], start: RegExp, ends: RegExp[]) {
  const first = lines.findIndex((line) => start.test(line) && line.length < 80);
  if (first < 0) return [];
  const last = lines.findIndex((line, index) => index > first && line.length < 80 && ends.some((end) => end.test(line)));
  return lines.slice(first + 1, last > first ? last : undefined);
}

function listFromBlock(block: string[]) {
  return Array.from(new Set(block.join(", ").split(/,|\||;/).map(clean).filter(Boolean)));
}

export function parseResumeText(text: string): ResumeData {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const joined = lines.join(" ");
  const email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "you@example.com";
  const phone = joined.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)?.[0] || "+91 00000 00000";
  const linkedin = joined.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-z0-9-_%]+/i)?.[0] || lines.find((line) => /linkedin/i.test(line)) || "linkedin.com/in/you";
  const name = lines.find((line) => !line.includes("@") && !/phone|mobile|linkedin|india|summary|specialist|developer|analyst/i.test(line)) || "Your Name";
  const location = lines.find((line) => /bangalore|bengaluru|chennai|hyderabad|india/i.test(line)) || "India";
  const summary = section(lines, /professional summary|summary/i, [/core skills|skills|experience|internship|education|certifications|projects/i]).join(" ") || "Experienced professional focused on measurable outcomes, documentation quality, and clear communication.";
  const skills = listFromBlock(section(lines, /core skills|skills/i, [/experience|internship|education|certifications|projects/i])).slice(0, 24);
  const expBlock = section(lines, /experience|internship/i, [/education|certifications|projects|publications/i]);
  const roleLine = expBlock.find((line) => /intern|specialist|analyst|associate|developer|engineer|manager/i.test(line)) || "Professional Experience";
  const dates = expBlock.join(" ").match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}).{0,18}(?:present|current|\d{4})/i)?.[0] || "Recent";
  const bullets = expBlock.filter((line) => /^-/.test(line) || /reviewed|ensured|maintained|collaborated|validated|managed|developed|improved/i.test(line)).map((line) => clean(line).replace(/^[-]\s*/, "")).slice(0, 6);
  const education = lines.filter((line) => /m\.??pharm|b\.??pharm|college|university|cgpa/i.test(line)).slice(0, 4).map((line) => ({
    degree: clean(line.split(/,| - /)[0] || "Education"),
    school: clean(line.split(/,| - /).slice(1).join(", ") || "University"),
    year: line.match(/\b20\d{2}(?:\s*-\s*20\d{2})?\b/)?.[0] || "",
    gpa: line.match(/(?:cgpa|gpa)\s*:?\s*[\d.]+\/?\d*/i)?.[0],
  }));
  const certifications = listFromBlock(section(lines, /certifications/i, [/projects|publications|experience|education/i])).slice(0, 8);
  const projects = section(lines, /projects|publications/i, [/certifications|experience|education/i]).filter((line) => !/projects|publications/i.test(line)).slice(0, 6);
  return {
    contact: { name, email, phone, linkedin, location },
    summary,
    experience: [{ title: roleLine, company: "", location, dates, bullets: bullets.length ? bullets : ["Delivered documented work aligned to stakeholder expectations."] }],
    skills: skills.length ? skills : ["Communication", "Documentation", "Quality Control"],
    education: education.length ? education : [{ degree: "Education", school: "University", year: "" }],
    certifications,
    projects,
  };
}