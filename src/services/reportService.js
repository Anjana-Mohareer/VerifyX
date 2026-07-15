import{getCandidates}from'./storage';

export function getReport(){const l=getCandidates();return{total:l.length,freshers:l.filter(c=>c.candidateType==='Fresher').length,experienced:l.filter(c=>c.candidateType==='Experienced').length,pending:l.filter(c=>c.status==='Pending Verification').length,approved:l.filter(c=>c.status==='Approved').length,rejected:l.filter(c=>c.status==='Rejected').length};}
