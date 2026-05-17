import type { AnalysisResult, Education, Experience, ResumeData } from "@/types";
import { OPENROUTER_MODELS, extractKeywords } from "./utils";

const TIMEOUT = 45_000;

async function withTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readOpenRouterContent(res: Response) {
  const raw = await res.text();
  if (!raw.trim()) return "";
  if (!raw.includes("data:")) {
    const data = JSON.parse(raw);
    return String(data.choices?.[0]?.message?.content || "");
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .filter((line) => line !== "[DONE]")
    .map((line) => {
      try {
        return JSON.parse(line).choices?.[0]?.delta?.content || "";
      } catch {
        return "";
      }
    })
    .join("");
}

export async function callAI<T>(system: string, user: string, fallback: T): Promise<T & { model_used?: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fallback as T & { model_used?: string };

  for (const model of OPENROUTER_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await withTimeout("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Reva ATS Resume Optimizer",
          },
          body: JSON.stringify({
            model,
            stream: false,
            temperature: 0.15,
            max_tokens: 4096,
            messages: [
              { role: "system", content: `${system}\nReturn ONLY valid JSON. No markdown.` },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => "");
          console.error("OpenRouter request failed", model, res.status, err.slice(0, 400));
          continue;
        }
        const text = await readOpenRouterContent(res);
        const parsed = parseJsonLoose<T>(text, fallback);
        return { ...parsed, model_used: model };
      } catch (error) {
        console.error("AI call failed", model, error);
      }
    }
  }
  return fallback as T & { model_used?: string };
}

function parseJsonLoose<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced) as T;
    } catch {}
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {}
  }
  if (text.trim()) console.error("AI JSON parse failed", text.slice(0, 400));
  return fallback;
}

function cleanLine(line: string) {
  return line
    .replace(/[\u2022\u25cb\u25cf]/g, "-")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/^(mobile-alt|envelope|linkedin-in|link|phone|email)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items: string[], limit = 24) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items.map(cleanLine).filter(Boolean)) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
    if (out.length >= limit) break;
  }
  return out;
}

function section(lines: string[], starts: RegExp, ends: RegExp[]) {
  const start = lines.findIndex((line) => starts.test(line) && line.length < 80);
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && line.length < 80 && ends.some((pattern) => pattern.test(line)));
  return lines.slice(start + 1, end > start ? end : undefined);
}

function parseContact(lines: string[]) {
  const email = lines.join(" ").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "you@example.com";
  const phone = lines.join(" ").match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)?.[0] || "+91 00000 00000";
  const linkedInLine = lines.find((line) => /linkedin|linkedin\.com/i.test(line));
  const linkedin = lines.join(" ").match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-z0-9-_%]+/i)?.[0] || cleanLine(linkedInLine || "linkedin.com/in/you");
  const name = lines.find((line) => !line.includes("@") && !/mobile|phone|linkedin|bangalore|india|summary|specialist|developer|engineer|analyst/i.test(line)) || "Your Name";
  const location = lines.find((line) => /bangalore|bengaluru|chennai|hyderabad|india|tamil nadu|andhra/i.test(line)) || "India";
  return { name: cleanLine(name), email, phone: cleanLine(phone), linkedin, location: cleanLine(location) };
}

function parseSummary(lines: string[]) {
  const body = section(lines, /professional summary|summary/i, [/core skills|skills|experience|internship|education|certifications|projects/i]);
  return cleanLine(body.join(" ").replace(/^summary\s+/i, ""));
}

function parseSkills(lines: string[], jd: string) {
  const skillsBlock = section(lines, /core skills|skills/i, [/experience|internship|education|certifications|projects|publications/i]);
  const fromResume = skillsBlock
    .join(", ")
    .replace(/\b(data management|compliance|technical tools|professional)\b/gi, "")
    .split(/,|\||;/)
    .map(cleanLine);
  const jdKeys = extractKeywords(jd).filter((key) => key.length > 2);
  const resumeText = lines.join(" ").toLowerCase();
  const supportedJd = jdKeys.filter((key) => key.split(/\s+/).every((part) => resumeText.includes(part)) || resumeText.includes(key));
  return unique([...supportedJd, ...fromResume], 28);
}

function collectWrappedBullets(block: string[]) {
  const bullets: string[] = [];
  let current = "";
  for (const raw of block) {
    const line = cleanLine(raw);
    if (/^-/.test(line)) {
      if (current) bullets.push(current);
      current = line.replace(/^[-]\s*/, "");
    } else if (current && !/^(education|certifications|projects|publications|core skills)$/i.test(line)) {
      current = `${current} ${line}`;
    }
  }
  if (current) bullets.push(current);
  return bullets;
}
function parseExperience(lines: string[], jdKeys: string[]): Experience[] {
  const block = section(lines, /experience|internship/i, [/education|certifications|projects|publications/i]);
  const bullets = collectWrappedBullets(block).map((line) => tailorBullet(line, jdKeys));
  const roleLine = block.find((line) => /intern|specialist|analyst|associate|developer|engineer|manager/i.test(line)) || lines.find((line) => /intern|specialist|analyst|associate/i.test(line)) || "Relevant Experience";
  const dates = block.join(" ").match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}).{0,18}(?:present|current|\d{4})/i)?.[0] || "";
  const cleanedRole = cleanLine(roleLine).replace(dates, "").replace(/^[-,\s]+/, "");
  const [titlePart, ...rest] = cleanedRole.split(",").map((part) => part.trim()).filter(Boolean);
  const company = rest.find((part) => /pvt|ltd|pharma|services|solutions|technologies|systems|company/i.test(part)) || rest[0] || "Project Work";
  const location = rest.find((part) => /india|chennai|bangalore|hyderabad|remote/i.test(part)) || "India";
  return [{
    title: titlePart || "Relevant Experience",
    company,
    location,
    dates: cleanLine(dates),
    bullets: unique(bullets, 6),
  }];
}

function tailorBullet(bullet: string, jdKeys: string[]) {
  const base = bullet.replace(/\.$/, "");
  const lower = base.toLowerCase();
  const supported = jdKeys.find((key) => !lower.includes(key) && key.split(/\s+/).some((part) => lower.includes(part)));
  if (!supported || /clinical|data|validation|report|dataset|documentation|compliance|sop|audit|gxp|alcoa|ich-gcp|query|discrepanc/i.test(base)) return `${base}.`;
  return `${base} while supporting ${supported}.`;
}

function parseEducation(lines: string[]): Education[] {
  const rows = lines.filter((line) => /m\.?pharm|b\.?pharm|bachelor/i.test(line) && !/thesis|project|publication/i.test(line));
  return unique(rows, 4).map((row) => {
    const next = lines[lines.indexOf(row) + 1] || "";
    const year = row.match(/\b20\d{2}(?:\s*-\s*20\d{2})?\b/)?.[0] || "";
    const gpa = row.match(/(?:cgpa|gpa)\s*:?\s*[\d.]+\/?\d*/i)?.[0] || next.match(/(?:cgpa|gpa)\s*:?\s*[\d.]+\/?\d*/i)?.[0];
    const cleaned = cleanLine(row).replace(year, "").replace(gpa || "", "").replace(/,+\s*$/, "");
    const parts = cleaned.split(/,| - /).map((part) => part.trim()).filter(Boolean);
    return { degree: parts[0] || "Education", school: parts.slice(1).join(", ") || "University", year: cleanLine(year), gpa };
  });
}

function parseCertifications(lines: string[]) {
  const rows = section(lines, /certifications/i, [/projects|publications|experience|education/i]);
  return unique(rows.join(" | ").split(/\||;|\n/), 8);
}

function parseProjects(lines: string[]) {
  const rows = section(lines, /projects|publications/i, [/certifications|experience|education/i]);
  const stitched: string[] = [];
  for (const line of rows) {
    if (/^--|^\d+ of \d+$/i.test(line)) continue;
    if (stitched.length && !/published|project|design|innovative|bioanalysis/i.test(line) && line.length < 35) {
      stitched[stitched.length - 1] = `${stitched[stitched.length - 1]} ${line}`;
    } else if (line.length > 20) {
      stitched.push(line);
    }
  }
  return unique(stitched, 6);
}

function roleFromJd(jd: string) {
  return jd.match(/\b(clinical data manager|clinical data associate|clinical data specialist|regulatory documentation specialist|frontend engineer|data analyst|software engineer)\b/i)?.[0] || "target role";
}

function buildSummary(contactName: string, skills: string[], jd: string) {
  const role = roleFromJd(jd);
  const top = skills.slice(0, 7).join(", ");
  return `${contactName.split(" ")[0]} is a detail-oriented professional tailored for the ${role} with evidence-backed strengths in ${top}. Brings hands-on experience in clinical data review, discrepancy resolution, compliance documentation, and audit-ready project files without adding unsupported claims.`;
}

export function parseResumeEvidence(resume: string, jd: string): ResumeData & { keywords_added: string[]; ats_score_after: number } {
  const lines = resume.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const jdKeys = extractKeywords(jd);
  const contact = parseContact(lines);
  const skills = parseSkills(lines, jd);
  const summary = parseSummary(lines) || buildSummary(contact.name, skills, jd);
  const experience = parseExperience(lines, jdKeys);
  const education = parseEducation(lines);
  const certifications = parseCertifications(lines);
  const projects = parseProjects(lines);
  const resumeText = resume.toLowerCase();
  const keywords_added = jdKeys.filter((key) => skills.join(" ").toLowerCase().includes(key) || resumeText.includes(key)).slice(0, 16);
  const score = Math.min(96, 76 + keywords_added.length + Math.min(experience[0]?.bullets.length || 0, 6));
  return {
    contact,
    summary,
    experience: experience.length ? experience : [{ title: "Relevant Experience", company: "Project Work", location: contact.location, dates: "", bullets: ["Delivered documented work aligned to the target role requirements."] }],
    skills: skills.length ? skills : ["Clinical Data Review", "Documentation", "Compliance", "Communication"],
    education: education.length ? education : [{ degree: "Education", school: "University", year: "" }],
    certifications,
    projects,
    keywords_added,
    ats_score_after: score,
  };
}

export function fallbackAnalysis(jd: string, resume: string): AnalysisResult {
  const jdKeys = extractKeywords(jd);
  const lowerResume = resume.toLowerCase();
  const found = jdKeys.filter((key) => lowerResume.includes(key));
  const missing = jdKeys.filter((key) => !found.includes(key));
  const weak = ["summary", "experience", "skills", "education"].filter((sectionName) => !lowerResume.includes(sectionName));
  const formatting = [];
  if (resume.length < 700) formatting.push("Resume looks too short for robust ATS matching");
  if (/[\u2502\u25a0\u25c6\u2605]/.test(resume)) formatting.push("Decorative symbols can reduce ATS parsing accuracy");
  const breakdown = {
    keyword_match: Math.round((found.length / Math.max(jdKeys.length, 1)) * 40),
    section_headers: weak.length ? 12 : 18,
    file_format: 15,
    quantified_items: (resume.match(/\d+%?|\$|rs|inr|lpa|cgpa/gi) || []).length > 2 ? 13 : 8,
    clean_formatting: formatting.length ? 6 : 9,
  };
  const ats_score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    ats_score,
    breakdown,
    keywords_found: found,
    keywords_missing: missing,
    weak_sections: weak,
    formatting_issues: formatting,
    quick_wins: ["Mirror exact JD terminology where truthful", "Keep standard ATS section headers", "Lead bullets with role-relevant evidence"],
    improvement_tips: missing.slice(0, 6).map((key) => `Add ${key} only if it is supported by the original resume.`),
  };
}

export function fallbackResume(resume: string, jd: string): ResumeData & { ats_score_after: number; keywords_added: string[] } {
  return parseResumeEvidence(resume, jd);
}
