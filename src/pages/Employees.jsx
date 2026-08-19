import Shell from'../components/Shell';
import{allCandidates}from'../services/employeeService';

export default function Employees(){const list=allCandidates();return <Shell><div className="page-head"><h1>Candidate Management</h1><p>View and manage candidate records.</p></div><div className="cards-list">{list.map(c=><article className="candidate-card" key={c.id}><div><h3>{c.name}</h3><p>{c.role} • {c.experience}</p></div><span className="badge in-review">{c.status}</span></article>)}</div></Shell>}
