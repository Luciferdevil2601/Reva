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
  preferred?: string,
): Promise<T & { model_used?: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fallback as T & { model_used?: string };
  const models = Array.from(
    new Set([preferred, process.env.OPENROUTER_MODEL, ...OPENROUTER_MODELS].filter(Boolean) as string[]),
  ).filter((model) => (OPENROUTER_MODELS as readonly string[]).includes(model));

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
  if (/[│■◆★]/.test(resume)) formatting.push("Decorative symbols can reduce ATS parsing accuracy");
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
  const keys = extractKeywords(jd).slice(0, 12);
  const lines = resume.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = lines.find((line) => line.includes("@"))?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "you@example.com";
  const name = lines.find((line) => !line.includes("@") && !/summary|experience|skills|education/i.test(line)) || "Your Name";
  const title = lines.find((line) => /engineer|developer|manager|analyst|designer|consultant|specialist|intern/i.test(line)) || "Relevant Experience";
  const company = lines.find((line) => /pvt|ltd|inc|llc|solutions|technologies|systems|company/i.test(line)) || "";
  const originalBullets = lines.filter((line) => /^[-•]/.test(line)).map((line) => line.replace(/^[-•]\s*/, "")).slice(0, 4);
  const bullets = (originalBullets.length ? originalBullets : ["Delivered projects with measurable quality and stakeholder impact."]).map(
    (bullet, index) => {
      const key = keys[index % Math.max(keys.length, 1)];
      return key && resume.toLowerCase().includes(key) ? `${bullet.replace(/\.$/, "")} with emphasis on ${key}.` : bullet;
    },
  );
  return {
    contact: { name, email, phone: "+91 00000 00000", linkedin: "linkedin.com/in/you", location: "India" },
    summary: `ATS-tailored professional profile aligned to ${keys.slice(0, 5).join(", ")} with emphasis on verified experience from the uploaded resume.`,
    experience: [{ title, company, location: "India", dates: "", bullets }],
    skills: keys.length ? keys : ["Communication", "Project Delivery", "Analysis"],
    education: [{ degree: "Education", school: "University", year: "Year" }],
    certifications: [],
    ats_score_after: Math.min(88, 62 + keys.filter((key) => resume.toLowerCase().includes(key)).length * 3),
    keywords_added: keys,
  };
}
