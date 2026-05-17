import type { ResumeData, TemplateId } from "@/types";

export function ResumeTemplate({ data, template }: { data: ResumeData; template: TemplateId }) {
  if (template === "creative") return <Creative data={data} />;
  if (template === "canva") return <Canva data={data} />;
  return (
    <article className={`resumePage ${template}`}>
      <div className="resumeHead">
        <h1>{data.contact.name}</h1>
        <p>{[data.contact.email, data.contact.phone, data.contact.linkedin, data.contact.location].filter(Boolean).join(" | ")}</p>
      </div>
      <Sections data={data} />
    </article>
  );
}

function Sections({ data }: { data: ResumeData }) {
  return (
    <>
      <h2>Professional Summary</h2>
      <p>{data.summary}</p>
      <h2>Experience</h2>
      {data.experience.map((e, i) => (
        <div key={i}>
          <p><b>{e.title}</b> - {e.company} <span style={{ float: "right" }}>{e.dates}</span></p>
          <p><i>{e.location}</i></p>
          <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
        </div>
      ))}
      <h2>Skills</h2>
      <p>{data.skills.join(", ")}</p>
      <h2>Education</h2>
      {data.education.map((e, i) => <p key={i}><b>{e.degree}</b> - {e.school} <span style={{ float: "right" }}>{e.year}</span></p>)}
      {data.certifications?.length ? <><h2>Certifications</h2><p>{data.certifications.join(", ")}</p></> : null}
    </>
  );
}

function Canva({ data }: { data: ResumeData }) {
  const skills = data.skills.slice(0, 20);
  const groups = ["Data Management", "Compliance", "Technical Tools", "Professional"];
  return (
    <article className="resumePage canva">
      <header className="canvaHead">
        <h1>{data.contact.name}</h1>
        <p className="canvaRole">{data.experience[0]?.title || "Professional"}</p>
        <p>{[data.contact.location, data.contact.phone, data.contact.email, data.contact.linkedin].filter(Boolean).join(" | ")}</p>
      </header>
      <h2>Professional Summary</h2>
      <p>{data.summary}</p>
      <h2>Core Skills</h2>
      <div className="skillGrid">
        {groups.map((label, i) => (
          <div className="skillRow" key={label}>
            <b>{label}</b>
            <span>{skills.slice(i * 5, i * 5 + 5).join(", ")}</span>
          </div>
        ))}
      </div>
      <h2>Experience</h2>
      {data.experience.map((e, i) => (
        <div className="timelineRow" key={i}>
          <b>{e.dates}</b>
          <div>
            <p><strong>{e.title}</strong>{e.company ? `, ${e.company}` : ""}{e.location ? `, ${e.location}` : ""}</p>
            <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          </div>
        </div>
      ))}
      <h2>Education</h2>
      {data.education.map((e, i) => (
        <div className="timelineRow" key={i}>
          <b>{e.year}</b>
          <p><strong>{e.degree}</strong>{e.school ? `, ${e.school}` : ""}{e.gpa ? `, ${e.gpa}` : ""}</p>
        </div>
      ))}
      {data.certifications?.length ? <><h2>Certifications</h2><p>{data.certifications.join(" | ")}</p></> : null}
    </article>
  );
}

function Creative({ data }: { data: ResumeData }) {
  return (
    <article className="resumePage creative">
      <aside className="creativeSide">
        <h1>{data.contact.name}</h1>
        <p>{data.contact.email}</p>
        <p>{data.contact.phone}</p>
        <p>{data.contact.linkedin}</p>
        <h2 style={{ color: "white", borderColor: "white" }}>Skills</h2>
        <p>{data.skills.join(", ")}</p>
        <h2 style={{ color: "white", borderColor: "white" }}>Education</h2>
        {data.education.map((e, i) => <p key={i}>{e.degree}<br />{e.school}<br />{e.year}</p>)}
      </aside>
      <main className="creativeMain">
        <h2>Professional Summary</h2>
        <p>{data.summary}</p>
        <h2>Experience</h2>
        {data.experience.map((e, i) => (
          <div key={i}>
            <p><b>{e.title}</b> - {e.company}</p>
            <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          </div>
        ))}
      </main>
    </article>
  );
}
