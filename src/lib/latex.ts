import type { ResumeData } from "@/types";

function esc(value?: string) {
  return String(value || "")
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

export function resumeToLatex(data: ResumeData) {
  const exp = data.experience
    .map(
      (role) => String.raw`
\textbf{${esc(role.title)}} \hfill ${esc(role.dates)}\\
\textit{${esc(role.company)}} \hfill ${esc(role.location)}
\begin{itemize}[noitemsep,leftmargin=*]
${role.bullets.map((b) => `  \\item ${esc(b)}`).join("\n")}
\end{itemize}`,
    )
    .join("\n");
  const edu = data.education
    .map((e) => `\\textbf{${esc(e.degree)}} -- ${esc(e.school)}${e.gpa ? ` -- ${esc(e.gpa)}` : ""} \\hfill ${esc(e.year)}`)
    .join("\\\\\n");
  const certs = data.certifications?.length ? `\\section{Certifications}\n${data.certifications.map(esc).join(", ")}` : "";
  const projects = data.projects?.length ? `\\section{Projects \\& Publications}\n${data.projects.map(esc).join("\\\\\n")}` : "";

  return String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[top=0.7in,bottom=0.7in,left=0.7in,right=0.7in]{geometry}
\usepackage{titlesec,enumitem,hyperref}
\usepackage[T1]{fontenc}
\pagenumbering{gobble}
\setlength{\parindent}{0pt}
\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]

\begin{document}
\begin{center}
  {\Huge\bfseries ${esc(data.contact.name)}}\\[4pt]
  ${esc(data.contact.email)} \textbullet{} ${esc(data.contact.phone)} \textbullet{} ${esc(data.contact.linkedin)} \textbullet{} ${esc(data.contact.location)}
\end{center}

\section{Professional Summary}
${esc(data.summary)}

\section{Experience}
${exp}

\section{Skills}
${data.skills.map(esc).join(", ")}

\section{Education}
${edu}

${certs}

${projects}
\end{document}
`;
}