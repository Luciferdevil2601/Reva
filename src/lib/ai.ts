import type { AnalysisResult, ResumeData } from "@/types";
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
  if (!res.body) {
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content || "");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
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

export async function callAI<T>(
  system: string,
  user: string,
  fallback: T,
): Promise<T & { model_used?: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fallback as T & { model_used?: string };
  const models = OPENROUTER_MODELS;

  for (const model of models) {
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
            stream: true,
            temperature: 0.2,
            max_tokens: 4096,
            messages: [
              { role: "system", content: `${system}\nReturn ONLY valid JSON.` },
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
        return { ...parseJsonLoose<T>(text, fallback), model_used: model };
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
  console.error("AI JSON parse failed", text.slice(0, 400));
  return fallback;
}

export function fallbackAnalysis(jd: string, resume: string): AnalysisResult {
  const jdKeys = extractKeywords(jd);
  const lowerResume = resume.toLowerCase();
  const found = jdKeys.filter((key) => lowerResume.includes(key));
  const missing = jdKeys.filter((key) => !found.includes(key));
  const weak = ["summary", "experience", "skills", "education"].filter((section) => !lowerResume.includes(section));
  const formatting = [];
  if (resume.length < 700) formatting.push("Resume looks too short for robust ATS matching");
  if (/[\u2502\u25a0\u25c6\u2605]/.test(resume)) formatting.push("Decorative symbols can reduce ATS parsing accuracy");
  const breakdown = {
    keyword_match: Math.round((found.length / Math.max(jdKeys.length, 1)) * 40),
    section_headers: weak.length ? 12 : 18,
    file_format: 15,
    quantified_items: (resume.match(/\d+%?|\$|rs|inr|lpa/gi) || []).length > 2 ? 13 : 8,
    clean_formatting: formatting.length ? 6 : 9,
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    ats_score: score,
    breakdown,
    keywords_found: found,
    keywords_missing: missing,
    weak_sections: weak,
    formatting_issues: formatting,
    quick_wins: ["Add missing JD keywords naturally", "Use standard section headers", "Quantify impact in bullets"],
    improvement_tips: missing.slice(0, 6).map((key) => `Add ${key} where it truthfully matches your work.`),
  };
}

export function fallbackResume(resume: string, jd: string): ResumeData & { ats_score_after: number; keywords_added: string[] } {
  const keys = extractKeywords(jd).slice(0, 18);
  const lowerResume = resume.toLowerCase();
  const supportedKeys = keys
    .filter((key) => {
      const normalized = key.replace(/\bapis\b/g, "api").replace(/\bengineer\b/g, "developer");
      return lowerResume.includes(key) || lowerResume.includes(normalized) || normalized.split(/\s+/).every((part) => lowerResume.includes(part));
    })
    .slice(0, 12);
  const lines = resume.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = lines.find((line) => line.includes("@"))?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "you@example.com";
  const phone = resume.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)?.[0] || "+91 00000 00000";
  const linkedin = resume.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-z0-9-_%]+/i)?.[0] || "linkedin.com/in/you";
  const name = lines.find((line) => !line.includes("@") && !/summary|experience|skills|education/i.test(line)) || "Your Name";
  const experienceIndex = lines.findIndex((line) => /^experience$/i.test(line));
  const roleLine = experienceIndex >= 0 ? lines.slice(experienceIndex + 1).find((line) => !line.startsWith("-")) : undefined;
  const [rolePart, datePart = ""] = (roleLine || "").split("|").map((part) => part.trim());
  const [titlePart, companyPart = ""] = rolePart.split(/\s+-\s+/).map((part) => part.trim());
  const title = titlePart || lines.find((line) => /engineer|developer|manager|analyst|designer|consultant|specialist|intern/i.test(line)) || "Relevant Experience";
  const company = companyPart || lines.find((line) => /pvt|ltd|inc|llc|solutions|technologies|systems|company/i.test(line)) || "Project Work";
  const educationIndex = lines.findIndex((line) => /^education$/i.test(line));
  const educationLine = educationIndex >= 0 ? lines[educationIndex + 1] || "" : "";
  const [degreeSchool, educationYear = "Year"] = educationLine.split("|").map((part) => part.trim());
  const [degree = "Education", school = "University"] = degreeSchool.split(/\s+-\s+/).map((part) => part.trim());
  const originalBullets = lines.filter((line) => /^[-\u2022]/.test(line)).map((line) => line.replace(/^[-\u2022]\s*/, "")).slice(0, 4);
  const bullets = (originalBullets.length ? originalBullets : ["Delivered projects with measurable quality and stakeholder impact."]).map(
    (bullet, index) => {
      const key = supportedKeys[index % Math.max(supportedKeys.length, 1)];
      return key ? `${bullet.replace(/\.$/, "")} with emphasis on ${key}.` : bullet;
    },
  );
  const score = Math.min(94, 72 + supportedKeys.length * 3 + Math.min(originalBullets.length, 4));
  return {
    contact: { name, email, phone, linkedin, location: "India" },
    summary: `ATS-tailored professional profile aligned to ${supportedKeys.slice(0, 6).join(", ") || "the target role"} with emphasis on verified experience from the uploaded resume.`,
    experience: [{ title, company, location: "India", dates: datePart, bullets }],
    skills: supportedKeys.length ? supportedKeys : ["Communication", "Project Delivery", "Analysis"],
    education: [{ degree, school, year: educationYear }],
    certifications: [],
    ats_score_after: score,
    keywords_added: supportedKeys,
  };
}
