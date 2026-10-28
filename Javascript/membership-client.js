export const supabaseConfig = Object.freeze({
  siteUrl: 'https://www.leshelterfoundation.org',
  url: 'https://iewrvbzgygmpcrlaqsaq.supabase.co',
  publishableKey: 'sb_publishable_g324SARvTZA8ZhNJLB-juQ_pLeQIJ8Z'
});
// Public connection settings only. Never put a secret/service_role key here.
export function createMembershipClient(config = supabaseConfig, transport = fetch) {
  let session = null;
  async function request(route, {method='GET', data, authenticated=false,rawData,headers={}}={}) {
    if(authenticated && (!session || session.expires_at <= Date.now())) {
      session=null; throw new Error('Please sign in again. Your session has expired.');
    }
    const response=await transport(config.url+route, {
      method, headers:{apikey:config.publishableKey,'Content-Type':'application/json',
        ...(authenticated ? {Authorization:'Bearer '+session.access_token} : {}),...headers},
      ...(rawData!==undefined?{body:rawData}:data===undefined?{}:{body:JSON.stringify(data)}), signal:AbortSignal.timeout(15000)
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok) {
      if(result?.code==='PGRST202' || result?.code==='PGRST205') throw new Error('Membership database setup is not complete. Apply the Supabase membership migration.');
      throw new Error(result?.msg || result?.message || result?.error_description || 'Unable to reach the membership service. Please try again.');
    }
    return result;
  }
  return {
    async signIn(email,password) {
      const result=await request('/auth/v1/token?grant_type=password',{method:'POST',data:{email,password}});
      session={access_token:result.access_token,expires_at:Date.now()+result.expires_in*1000};
      try { const permission=await request('/rest/v1/rpc/is_membership_admin',{method:'POST',data:{},authenticated:true});
        if(permission!==true) throw new Error('This account does not have membership administrator access.');
      } catch(error) {session=null;throw error;}
    },
    async signOut() {try {if(session)await request('/auth/v1/logout',{method:'POST',authenticated:true});}finally{session=null;}},
    async uploadPhoto(memberId,file) {
      if(!file||file.size>5*1024*1024)throw new Error('Choose a PNG, JPEG or WebP photo smaller than 5 MB.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      let extension,type;
      if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){extension='jpg';type='image/jpeg';}
      else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){extension='png';type='image/png';}
      else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){extension='webp';type='image/webp';}
      else throw new Error('Only PNG, JPEG and WebP image files are supported.');
      const path=memberId+'/'+crypto.randomUUID()+'.'+extension;
      await request('/storage/v1/object/member-photos/'+path,{method:'POST',rawData:bytes,headers:{'Content-Type':type},authenticated:true});
      try{await request('/rest/v1/ngo_members?id=eq.'+encodeURIComponent(memberId),{method:'PATCH',data:{photo_path:path},authenticated:true});}
      catch(error){await request('/storage/v1/object/member-photos',{method:'DELETE',data:{prefixes:[path]},authenticated:true}).catch(()=>{});throw error;}
      return path;
    },
    async photoUrl(path){
      if(!path)return null;
      const result=await request('/storage/v1/object/sign/member-photos/'+path,{method:'POST',data:{expiresIn:120},authenticated:true});
      return config.url+'/storage/v1'+result.signedURL;
    },
    list:()=>request('/rest/v1/ngo_members?select=*&order=created_at.desc',{authenticated:true}),
    create:data=>request('/rest/v1/rpc/create_ngo_member',{method:'POST',data:{details:data},authenticated:true}),
    update:(id,data)=>request('/rest/v1/ngo_members?id=eq.'+encodeURIComponent(id),{method:'PATCH',data,authenticated:true}),
    verify:token=>request('/rest/v1/rpc/verify_ngo_member',{method:'POST',data:{token}})
  };
}
