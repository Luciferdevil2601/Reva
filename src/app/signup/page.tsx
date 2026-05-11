import Link from "next/link";
import { SignupForm } from "@/components/Auth/SignupForm";
export default function Signup(){return <><nav className="nav"><Link className="brand" href="/">Reva ATS</Link><Link href="/login">Login</Link></nav><main className="authWrap"><SignupForm/></main></>}
