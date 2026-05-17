export type TemplateId = "canva"|"modern"|"classic"|"minimal"|"executive"|"creative";
export type ScoreBreakdown = { keyword_match:number; section_headers:number; file_format:number; quantified_items:number; clean_formatting:number };
export type Experience = { title:string; company:string; location:string; dates:string; bullets:string[] };
export type Education = { degree:string; school:string; year:string; gpa?:string };
export type ResumeData = { contact:{name:string;email:string;phone:string;linkedin:string;location:string}; summary:string; experience:Experience[]; skills:string[]; education:Education[]; certifications?:string[] };
export type AnalysisResult = { ats_score:number; breakdown:ScoreBreakdown; keywords_found:string[]; keywords_missing:string[]; quick_wins:string[]; improvement_tips:string[]; weak_sections:string[]; formatting_issues:string[]; model_used?:string };
