const safeParse=(value,fallback)=>{try{return JSON.parse(value)??fallback}catch{return fallback}};
const read=(k,f=[])=>safeParse(localStorage.getItem(k),f);
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
export const getCandidates=()=>read('verifyx_candidates',[]);
export const saveCandidates=(list)=>write('verifyx_candidates',list);
export const getSession=()=>safeParse(sessionStorage.getItem('verifyx_session'),null);
export const setSession=(s)=>sessionStorage.setItem('verifyx_session',JSON.stringify(s));
export const clearSession=()=>sessionStorage.removeItem('verifyx_session');
export const fileToDataUrl=(file)=>new Promise((resolve,reject)=>{if(!file)return resolve('');const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
export const appId=()=> 'VX-'+Date.now().toString().slice(-6)+'-'+Math.floor(Math.random()*900+100);

export const getHrProfile=()=>safeParse(localStorage.getItem('verifyx_hr_profile'),{});
export const saveHrProfile=(profile)=>{localStorage.setItem('verifyx_hr_profile',JSON.stringify(profile));const current=getSession();if(current&&current.type==='HR'){setSession({...current,name:profile.name,email:profile.email,phone:profile.phone})}return profile;};
