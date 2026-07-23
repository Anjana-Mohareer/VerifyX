import {ADMIN_USERS} from '../utils/constants';
import{getCandidates,saveCandidates,setSession,clearSession,appId}from'./storage';


export function registerCandidate(data){const list=getCandidates();if(list.some(c=>c.email?.toLowerCase()===data.email.toLowerCase()))throw new Error('Email already registered. Please login.');const candidate={id:appId(),createdAt:new Date().toISOString(),status:'Draft',remarks:'',documents:[],...data};saveCandidates([candidate,...list]);setSession({type:'CANDIDATE',email:candidate.email,id:candidate.id,name:candidate.fullName});return candidate;}
export function loginCandidate(email,password){const c=getCandidates().find(x=>x.email?.toLowerCase()===email.toLowerCase()&&x.password===password);if(!c)throw new Error('Invalid candidate email or password');setSession({type:'CANDIDATE',email:c.email,id:c.id,name:c.fullName});return c;}
export function loginAdmin(email,password){const u=ADMIN_USERS.find(x=>x.email===email&&x.password===password);if(!u)throw new Error('Invalid HR email or password');setSession({type:u.role,email:u.email,name:u.name});return u;}
export function logout(){clearSession();}
