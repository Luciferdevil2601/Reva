import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(req:NextRequest){
  const isProtected=req.nextUrl.pathname.startsWith('/dashboard/history')||req.nextUrl.pathname.startsWith('/owner');
  if(isProtected&&!req.cookies.get('reva_session')){
    const url=req.nextUrl.clone(); url.pathname='/login'; url.searchParams.set('next',req.nextUrl.pathname); return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config={matcher:["/dashboard/:path*","/owner/:path*"]};
