import Sidebar from'../components/Sidebar';
import useAuth from'../hooks/useAuth';

export default function Profile(){const{session}=useAuth();return <div className="app"><Sidebar type={session?.type}/><main className="content"><h1>Profile</h1><section className="panel"><div className="avatar">{session?.name?.[0]||'U'}</div><h2>{session?.name}</h2><p><b>Email:</b> {session?.email}</p><p><b>Role:</b> {session?.type}</p></section></main></div>}
