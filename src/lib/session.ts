import { cookies } from "next/headers";
import { OWNER_EMAILS, isOwner } from "./entitlements";

export type SessionUser = { email:string; name?:string; plan:"free"|"pro"|"premium"|"owner"; isOwner:boolean };
const cookieName="reva_session";

export function makeSession(email:string,name?:string,plan:"free"|"pro"|"premium"="free"):SessionUser{
  const owner=isOwner(email);
  return { email:email.toLowerCase(), name, plan:owner?"owner":plan, isOwner:owner };
}
export function setSession(user:SessionUser){ cookies().set(cookieName, Buffer.from(JSON.stringify(user)).toString("base64url"), { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", path:"/", maxAge:60*60*24*30 }); }
export function clearSession(){ cookies().delete(cookieName); }
export function getSession():SessionUser|null{ const raw=cookies().get(cookieName)?.value; if(!raw) return null; try{ const user=JSON.parse(Buffer.from(raw,"base64url").toString("utf8")); return { ...user, isOwner: OWNER_EMAILS.includes(String(user.email).toLowerCase()) }; }catch{return null;} }
