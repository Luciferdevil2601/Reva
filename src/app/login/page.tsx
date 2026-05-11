import Link from "next/link";
import { LoginForm } from "@/components/Auth/LoginForm";
export default function Login(){return <><nav className="nav"><Link className="brand" href="/">Reva ATS</Link><Link href="/signup">Signup</Link></nav><main className="authWrap"><LoginForm/></main></>}
