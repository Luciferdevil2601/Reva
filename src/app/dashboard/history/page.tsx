import Link from "next/link";
export default function History(){return <><nav className="nav"><Link className="brand" href="/dashboard">Reva ATS</Link></nav><main className="history"><h1>Analysis History</h1><p>Connect Supabase to save and view past analyses. Preview mode keeps all work in the browser session.</p><div className="card">No saved analyses yet.</div></main></>}
