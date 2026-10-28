import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function cloudRepository(env=process.env,transport=fetch){
 const url=env.SUPABASE_URL?.replace(/\/$/,'');const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url&&!key)return null;
 if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('Configure SUPABASE_URL and SUPABASE_SECRET_KEY together.');
 async function request(route,{method='GET',data,headers={}}={}){
  const response=await transport(url+route,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',...headers},...(data===undefined?{}:{body:Buffer.isBuffer(data)?data:JSON.stringify(data)}),signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok){const error=new Error(response.status===404?'Supabase CMS setup is missing. Apply the migration before enabling cloud mode.':'Supabase storage operation failed. Check the server configuration and migrations.');error.status=result?.code==='P0001'?409:503;throw error;}
  return result;
 }
 return {
  async publicPhoto(token){
    const path=await request('/rest/v1/rpc/get_member_photo',{method:'POST',data:{token}});
    if(!path)return null;
    const result=await request('/storage/v1/object/sign/member-photos/'+path,{method:'POST',data:{expiresIn:60}});
    return url+'/storage/v1'+result.signedURL;
  },
  async load(){const rows=await request('/rest/v1/cms_store?id=eq.main&select=version,payload');if(!rows?.length)throw Object.assign(new Error('Import the existing CMS before starting cloud mode: npm run migrate:cms'),{status:503});return rows[0];},
  save:(version,payload)=>request('/rest/v1/rpc/cms_commit',{method:'POST',data:{expected_version:version,new_payload:payload}}),
  initialize:payload=>request('/rest/v1/rpc/cms_initialize',{method:'POST',data:{initial_payload:payload}}),
  async upload(file,bytes,type,upsert=false){await request('/storage/v1/object/cms-media/'+file,{method:'POST',data:bytes,headers:{'Content-Type':type,'x-upsert':String(upsert)}});return url+'/storage/v1/object/public/cms-media/'+file;},
  async subscribe(email){await request('/rest/v1/newsletter_subscribers?on_conflict=email',{method:'POST',data:{email},headers:{Prefer:'resolution=ignore-duplicates'}});},
  async importSubscribers(rows){if(rows.length)await request('/rest/v1/newsletter_subscribers?on_conflict=email',{method:'POST',data:rows.map(row=>({email:row.email,created_at:row.subscribedAt||new Date().toISOString()})),headers:{Prefer:'resolution=ignore-duplicates'}});},
  rate: key=>request('/rest/v1/rpc/cms_rate_limit',{method:'POST',data:{request_key:key}})
 };
}
