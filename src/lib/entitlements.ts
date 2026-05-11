export const OWNER_EMAILS = ["paletiganesh456@gmail.com","paletiganesh218@gmail.com"];
export const PLAN_LIMITS = { free:{analyses:3, optimize:0, pdf:0}, pro:{analyses:30,optimize:30,pdf:30}, premium:{analyses:-1,optimize:-1,pdf:-1} } as const;
export function isOwner(email?:string|null){return !!email && OWNER_EMAILS.includes(email.toLowerCase())}
export function canUse(email:string|undefined, plan:keyof typeof PLAN_LIMITS="free"){ if(isOwner(email)) return {allowed:true, plan:"owner", remaining:-1}; return {allowed:true, plan, remaining:PLAN_LIMITS[plan].analyses}; }
