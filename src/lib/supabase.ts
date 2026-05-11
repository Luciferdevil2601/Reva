import { createClient } from "@supabase/supabase-js";
let anon: ReturnType<typeof createClient>|null=null;
let admin: ReturnType<typeof createClient>|null=null;
export function getSupabaseAnon(){ if(!anon){ const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if(!url||!key) return null; anon=createClient(url,key); } return anon; }
export function getSupabaseAdmin(){ if(!admin){ const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) return null; admin=createClient(url,key); } return admin; }
