import type { ResumeData, TemplateId } from "@/types";

function esc(value: unknown) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export function resumeToHtml(data: Partial<ResumeData>, template: TemplateId) {
  const contact = data.contact || { name: "Your Name", email: "", phone: "", linkedin: "", location: "" };
  const experience = data.experience || [];
  const education = data.education || [];
  return `<html><head><style>body{font-family:Arial;margin:40px;color:#111}.head{border-bottom:2px solid #1e3a5f;padding-bottom:12px}h1{margin:0;color:#1e3a5f}h2{font-size:13px;text-transform:uppercase;border-bottom:1px solid #1e3a5f;color:#1e3a5f}li{margin:4px 0}.executive .head{background:#1e3a5f;color:white;padding:24px}.executive h1{color:white}.classic{font-family:Georgia,serif}.creative{border-left:72px solid #1e3a5f;padding-left:24px}</style></head><body class="${esc(template)}"><div class="head"><h1>${esc(contact.name || "Your Name")}</h1><p>${esc(contact.email)} | ${esc(contact.phone)} | ${esc(contact.linkedin)}</p></div><h2>Professional Summary</h2><p>${esc(data.summary)}</p><h2>Experience</h2>${experience.map((e)=>`<p><b>${esc(e.title)}</b> - ${esc(e.company)} <span style="float:right">${esc(e.dates)}</span></p><ul>${(e.bullets||[]).map((b)=>`<li>${esc(b)}</li>`).join("")}</ul>`).join("")}<h2>Skills</h2><p>${(data.skills||[]).map(esc).join(", ")}</p><h2>Education</h2>${education.map((e)=>`<p><b>${esc(e.degree)}</b> - ${esc(e.school)} <span style="float:right">${esc(e.year)}</span></p>`).join("")}</body></html>`;
}
