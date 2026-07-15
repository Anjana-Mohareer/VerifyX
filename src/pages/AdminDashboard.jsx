import{useEffect,useState}from'react';
import Shell from'../components/Shell';
import StatCard from'../components/StatCard';
import{allCandidates,deleteCandidate}from'../services/employeeService';

export default function AdminDashboard()
{
    const[list,setList]=useState([]);useEffect(()=>setList(allCandidates()),[]);
    const del=id=>{deleteCandidate(id);setList(allCandidates())};
    return <Shell><div className="page-head"><span className="eyebrow">Admin workspace</span><h1>Verification Dashboard</h1><p>Manage candidates, documents and verification workflow from one command center.</p></div><div className="stats-grid"><StatCard icon="👥" label="Total Candidates" value={list.length} trend="Live records"/><StatCard icon="✅" label="Verified" value={list.filter(x=>x.status==='Verified').length} trend="Completed"/><StatCard icon="⏳" label="Pending" value={list.filter(x=>x.status!=='Verified').length} trend="Needs review"/><StatCard icon="📈" label="Avg Score" value="84%" trend="Trust index"/></div><div className="table-card"><div className="table-title"><h2>Recent Candidates</h2><button className="btn primary small">+ Add Candidate</button></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Experience</th><th>Status</th><th>Score</th><th>Action</th></tr></thead><tbody>{list.map(c=><tr key={c.id}><td>{c.id}</td><td><b>{c.name}</b><small>{c.email}</small></td><td>{c.role}</td><td>{c.experience}</td><td><span className={'badge '+c.status.toLowerCase().replaceAll(' ','-')}>{c.status}</span></td><td>{c.score}%</td><td><button onClick={()=>del(c.id)} className="ghost-btn">Delete</button></td></tr>)}</tbody></table></div></div></Shell>}
