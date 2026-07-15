const BASE_URL=import.meta.env.VITE_API_BASE_URL||'';

async function request(path,options={})
{
    const token=sessionStorage.getItem('verifyx_token');const res=await fetch(`${BASE_URL}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});if(!res.ok)throw new Error(await res.text()||'API request failed');return res.status===204?null:res.json();}
export const api={login:(body)=>request('/api/auth/login',{method:'POST',body:JSON.stringify(body)}),candidates:()=>request('/api/candidates'),candidate:(id)=>request(`/api/candidates/${id}`),updateCandidate:(id,body)=>request(`/api/candidates/${id}`,{method:'PUT',body:JSON.stringify(body)}),verify:(id,body)=>request(`/api/verification/${id}`,{method:'PUT',body:JSON.stringify(body)}),reports:()=>request('/api/reports')};
