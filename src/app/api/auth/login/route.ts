import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase";
export async function POST(req:Request){const supabase=getSupabaseAnon();const body=await req.json();if(!supabase)return NextResponse.json({ok:true,preview:true,message:"Supabase not configured. Login stub accepted."});const {data,error}=await supabase.auth.signInWithPassword({email:body.email,password:body.password});return NextResponse.json({data,error},{status:error?400:200})}
