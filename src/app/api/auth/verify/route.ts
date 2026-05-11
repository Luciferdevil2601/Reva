import { NextResponse } from "next/server";
export async function POST(){return NextResponse.json({ok:true,message:"OTP verification route ready. Configure Supabase/Resend for production email OTP."})}
