import {newsletterHandler} from './newsletter.mjs';
import {websiteLinks} from './link-inventory.mjs';
import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = process.env.LESHELTER_ADMIN_DATA || path.join(root, '.admin');
await mkdir(dataDir, { recursive: true });
const seed = JSON.parse(await readFile(path.join(root, 'admin/seed.json'), 'utf8'));
const stateFile = path.join(dataDir, 'state.json');
const publishedFile = process.env.LESHELTER_ADMIN_PUBLISH_FILE || path.join(root,'admin/content.js');
let state;
try { state = JSON.parse(await readFile(stateFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  state = { users: [], draft: structuredClone(seed), published: structuredClone(seed), revision: 0, history: [], audit: [] };
}
// Fill newly introduced product fields without replacing saved names or prices.
function hydrateProducts(content){for(const product of content.products||[]){
 if(product.colors===undefined)product.colors=[{name:'White',hex:'#ffffff',image:'',alt:''},{name:'Green',hex:'#15803d',image:'',alt:''},{name:'Black',hex:'#161f19',image:'',alt:''}];
 const defaults=seed.products.find(item=>item.id===product.id);
 if(defaults)for(const key of ['category','description','image','imageAlt'])if(product[key]===undefined)product[key]=defaults[key];
}}
for(const content of [state.draft,state.published])hydrateProducts(content);
const sessions = new Map();
const attempts = new Map();
const roles = ['Owner', 'Administrator', 'Editor', 'Viewer'];
const sections = ['pages','navigation','theme','event','timing','media','products'];
const permissions = {
  Owner: sections,
  Administrator: sections,
  Editor: ['pages','navigation','event','timing','media'],
  Viewer: []
};
const publicUser = user => ({ id:user.id, name:user.name, email:user.email, role:user.role, areas:user.areas });
const allowed = user => user.areas ? permissions[user.role].filter(area => user.areas.includes(area)) : permissions[user.role];
let queue = Promise.resolve();
const persist = async () => {
  const content = JSON.stringify(state);
  queue = queue.catch(() => {}).then(async () => {
    await writeFile(stateFile+'.tmp', content, { mode:0o600 });
    await rename(stateFile+'.tmp', stateFile);
  });
  await queue;
};
const audit = (user, action) => {
  state.audit.unshift({ id:randomBytes(8).toString('hex'), at:new Date().toISOString(), user:user.name, action });
  state.audit = state.audit.slice(0,500);
};
const passwordHash = (password, salt) => scryptSync(password, salt, 64).toString('hex');
function makeUser(input) {
  if (!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||'') || typeof input.password !== 'string' || input.password.length<12 || input.password.length>200) throw new Error('Use a name, valid email and a password of 12–200 characters.');
  if (state.users.some(user => user.email === input.email.toLowerCase())) throw new Error('This email is already in use.');
  if (!roles.includes(input.role)) throw new Error('Choose a valid role.');
  const salt = randomBytes(16).toString('hex');
  return { id:randomBytes(12).toString('hex'),name:input.name.trim().slice(0,100),email:input.email.toLowerCase(),role:input.role,areas:Array.isArray(input.areas)?input.areas.filter(area=>sections.includes(area)):null,salt,hash:passwordHash(input.password,salt) };
}
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
function json(res, status, body) { res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body)); }
async function body(req) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of req) {
    buffer = Buffer.concat([buffer,chunk]);
    if (buffer.length>8*1024*1024) throw new Error('Request exceeds the 8 MB limit.');
  }
  return JSON.parse(buffer.toString()||'{}');
}
function session(req) {
  const cookie = /(?:^|;\s*)ls_admin=([a-f0-9]+)/.exec(req.headers.cookie||'');
  const entry = cookie && sessions.get(cookie[1]);
  if (!entry || entry.expires<Date.now()) return null;
  const user=state.users.find(user=>user.id===entry.userId);
  return user ? {entry,user,token:cookie[1]} : null;
}
function newSession(res,user) {
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
  sessions.set(token,{userId:user.id,csrf,expires:Date.now()+8*3600000});
  res.setHeader('Set-Cookie',`ls_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
  return {user:publicUser(user),csrf,permissions:allowed(user)};
}
function safeURL(value, image=false) {
  if (typeof value!=='string' || value.length>2000 || /[\x00-\x1f]/.test(value)) return false;
  if (/^(?:javascript|data|vbscript|file):/i.test(value.trim()) || /^\/\//.test(value.trim())) return false;
  if (image && /^[a-z]+:/i.test(value)) return /^https:\/\//i.test(value);
  return !/^[a-z]+:/i.test(value) || /^(https?:|mailto:|tel:)/i.test(value);
}
function validateTextStyles(styles){
 if(styles===undefined)return;
 if(!styles||typeof styles!=='object'||Array.isArray(styles)||Object.keys(styles).length>10000)throw new Error('Invalid text formatting.');
 const rules={color:value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value),fontSize:value=>Number.isFinite(value)&&value>=8&&value<=120,textAlign:value=>['left','center','right','justify'].includes(value),fontWeight:value=>['400','700'].includes(value),fontStyle:value=>['normal','italic'].includes(value),textDecoration:value=>['none','underline'].includes(value),fontFamily:value=>['Inter, Arial, sans-serif','Georgia, serif','Arial, sans-serif','Verdana, sans-serif'].includes(value)};
 for(const [key,style]of Object.entries(styles)){
  if(!/^(pages|products|navigation|event)\.[a-z0-9.:-]+$/i.test(key)||/(__proto__|constructor|prototype)/.test(key)||!style||typeof style!=='object'||Array.isArray(style)||!Object.entries(style).every(([property,value])=>rules[property]?.(value)))throw new Error('Use valid text formatting values.');
 }
}
function validateDraft(draft) {
  validateTextStyles(draft?.textStyles);
  if (!draft || !Array.isArray(draft.pages) || draft.pages.length!==seed.pages.length) throw new Error('Invalid page collection.');
  for (const page of draft.pages) {
    const source=seed.pages.find(item=>item.id===page.id);
    if (!source || page.file!==source.file || !Array.isArray(page.sections) || page.sections.length>100) throw new Error('Invalid page or section collection.');
    const ids=new Set();
    for (const section of page.sections) {
      if (!/^[a-z0-9-]+$/i.test(section.id) || ids.has(section.id)) throw new Error('Section IDs must be unique.');
      ids.add(section.id);
      if (section.custom) {
        if (!safeURL(section.buttonUrl||'') || !safeURL(section.image||'',true)) throw new Error('Use valid section links and image paths.');
        continue;
      }
      const original=source.sections.find(item=>item.id===(section.sourceId||section.id));
      if (!original) throw new Error('Unknown section.');
      if (!Array.isArray(section.fields) || section.fields.length>2000) throw new Error('Invalid fields.');
      for (const field of section.fields) {
        const originalField=original.fields.find(item=>item.id===field.id);
        if (!originalField || field.key!==originalField.key || field.attribute!==originalField.attribute || typeof field.value!=='string' || field.value.length>10000) throw new Error('Invalid editable field.');
        if (['href','src'].includes(field.attribute) && !safeURL(field.value,field.attribute==='src')) throw new Error('Use a relative path or a supported URL.');
        field.default=originalField.default;
      }
    }
    for (const locked of source.sections.filter(section=>section.locked)) {
      const found=page.sections.find(section=>section.id===locked.id);
      if (!found || found.hidden) throw new Error('Header and footer cannot be deleted or hidden.');
    }
  }
  if (!draft.theme || !Object.values(draft.theme).every(value=>/^#[0-9a-f]{6}$/i.test(value))) throw new Error('Use six-digit hex theme colours.');
  if (!Array.isArray(draft.navigation) || draft.navigation.length>20 || !draft.navigation.every(item=>item.label?.trim()&&safeURL(item.url))) throw new Error('Invalid navigation links.');
  if (!draft.event || !Number.isFinite(Date.parse(draft.event.start)) || Date.parse(draft.event.end)<Date.parse(draft.event.start) || !safeURL(draft.event.flyer,true)) throw new Error('Use valid event dates and a flyer path.');
  if (!Object.values(draft.timing||{}).every(value=>Number.isFinite(value)&&value>=1000&&value<=60000)) throw new Error('Carousel timing must be between 1 and 60 seconds.');
  if (!Array.isArray(draft.products) || draft.products.length>500 || new Set(draft.products.map(item=>item.id)).size!==draft.products.length || !draft.products.every(item=>
    typeof item.id==='string' && /^[a-z][a-z0-9-]{0,79}$/.test(item.id) && !['constructor','prototype','__proto__'].includes(item.id) &&
    typeof item.name==='string' && item.name.trim() && item.name.length<=200 && Number.isFinite(item.price) && item.price>=0 && item.price<=100000 &&
    typeof item.category==='string' && item.category.trim() && item.category.length<=60 && item.category.toLowerCase()!=='all' &&
    typeof item.description==='string' && item.description.length<=2000 && typeof item.image==='string' && (!item.image || safeURL(item.image,true)) &&
    typeof item.imageAlt==='string' && item.imageAlt.length<=500 &&
    (item.colors===undefined || Array.isArray(item.colors) && item.colors.length<=30 && new Set(item.colors.map(color=>String(color.name).trim().toLowerCase())).size===item.colors.length && item.colors.every(color=>typeof color.name==='string' && color.name.trim() && color.name.length<=30 && /^#[a-f0-9]{6}$/i.test(color.hex) && typeof color.image==='string' && (!color.image || safeURL(color.image,true)) && typeof color.alt==='string' && color.alt.length<=500)))) throw new Error('Use unique product IDs, names, valid prices, categories and safe image paths.');
  if (!Array.isArray(draft.media) || draft.media.length>2000 || !draft.media.every(item=>safeURL(item.url,true)&&typeof item.alt==='string')) throw new Error('Invalid media library.');
  return draft;
}
function requireRole(user, list) { if (!list.includes(user.role)) {const error=new Error('Your role does not allow this action.');error.status=403;throw error;} }
const subscribe=newsletterHandler(dataDir);
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' https://script.google.com; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
  try {
    const url=new URL(req.url,'http://localhost');
    const pathname=url.pathname;
    if(pathname==='/api/newsletter')return await subscribe(req,res);
    if (pathname.startsWith('/api/admin/')) {
      res.setHeader('Cache-Control','no-store');
      const write=!['GET','HEAD'].includes(req.method);
      if (write && req.headers.origin!==`http://${req.headers.host}`) return json(res,403,{error:'Same-origin requests are required.'});
      if (pathname==='/api/admin/session' && req.method==='GET') {
        const auth=session(req);
        return json(res,200,{setup:state.users.length===0,...(auth?{user:publicUser(auth.user),csrf:auth.entry.csrf,permissions:allowed(auth.user)}:{user:null})});
      }
      if (['/api/admin/setup','/api/admin/login'].includes(pathname) && req.method==='POST') {
        const key=req.socket.remoteAddress;
        const record=attempts.get(key)||{count:0,at:Date.now()};
        if (Date.now()-record.at>60000) {record.count=0;record.at=Date.now();}
        record.count++;attempts.set(key,record);
        if (record.count>10) return json(res,429,{error:'Too many attempts. Try again in a minute.'});
        const input=await body(req);
        if(pathname.endsWith('/setup')) {
          if(state.users.length) return json(res,403,{error:'Owner account already configured.'});
          const user=makeUser({...input,role:'Owner'});state.users.push(user);audit(user,'Created initial owner account');await persist();return json(res,201,newSession(res,user));
        }
        const user=state.users.find(user=>user.email===String(input.email).toLowerCase());
        const actual=passwordHash(String(input.password||'').slice(0,200),user?.salt||'invalid-user');
        if (!user || !timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(user.hash,'hex'))) return json(res,401,{error:'Email or password is incorrect.'});
        attempts.delete(key);audit(user,'Signed in');await persist();return json(res,200,newSession(res,user));
      }
      const auth=session(req);
      if(!auth)return json(res,401,{error:'Sign in to continue.'});
      const {user,entry}=auth;
      if(write&&req.headers['x-csrf-token']!==entry.csrf)return json(res,403,{error:'Invalid request token. Sign in again.'});
      if(pathname==='/api/admin/logout'&&req.method==='POST'){sessions.delete(auth.token);res.setHeader('Set-Cookie','ls_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
      if(pathname==='/api/admin/links'&&req.method==='GET')return json(res,200,{items:await websiteLinks(root,seed.pages)});
      if(pathname==='/api/admin/state'&&req.method==='GET')return json(res,200,{draft:state.draft,published:state.published,revision:state.revision,history:state.history.map(({content,...revision})=>revision),audit:state.audit,users:user.role==='Owner'?state.users.map(publicUser):[],permissions:allowed(user)});
      if(pathname==='/api/admin/draft'&&req.method==='PUT') {
        if(!allowed(user).length)return json(res,403,{error:'Viewer access is read-only.'});
        const input=await body(req);
        if(input.revision!==state.revision)return json(res,409,{error:'Someone saved a newer revision. Reload before editing.'});
        const draft=validateDraft(input.draft);
        for(const area of sections)if(JSON.stringify(draft[area])!==JSON.stringify(state.draft[area])&&!allowed(user).includes(area))return json(res,403,{error:`You cannot edit ${area}.`});
        for(const key of new Set([...Object.keys(draft.textStyles||{}),...Object.keys(state.draft.textStyles||{})]))if(JSON.stringify(draft.textStyles?.[key])!==JSON.stringify(state.draft.textStyles?.[key])&&!allowed(user).includes(key.split('.')[0]))return json(res,403,{error:'You cannot format this content area.'});
        state.history.unshift({id:randomBytes(8).toString('hex'),at:new Date().toISOString(),user:user.name,label:'Saved draft',content:structuredClone(state.draft)});state.history=state.history.slice(0,30);
        state.draft=draft;state.revision++;audit(user,'Saved website draft');await persist();return json(res,200,{revision:state.revision});
      }
      if(pathname==='/api/admin/submit'&&req.method==='POST'){requireRole(user,['Owner','Administrator','Editor']);audit(user,'Submitted current saved draft for approval');await persist();return json(res,200,{ok:true});}
      if(pathname==='/api/admin/publish'&&req.method==='POST') {
        requireRole(user,['Owner','Administrator']);
        const input=await body(req);if(input.revision!==state.revision)return json(res,409,{error:'Draft changed. Reload before publishing.'});
        const content=validateDraft(structuredClone(state.draft));
        for(const page of content.pages)for(const section of page.sections)if(!section.custom)section.fields=section.fields.filter(field=>field.value!==field.default||content.textStyles?.[['pages',page.id,section.id,field.id].join('.')]);
        await writeFile(publishedFile+'.tmp','window.LE_SHELTER_CONTENT = '+JSON.stringify(content).replace(/</g,'\\u003c')+';\n');
        await rename(publishedFile+'.tmp',publishedFile);
        state.published=structuredClone(state.draft);audit(user,'Published saved draft to workspace website files');await persist();return json(res,200,{ok:true});
      }
      if(pathname==='/api/admin/restore'&&req.method==='POST') {
        requireRole(user,['Owner','Administrator']);const input=await body(req);
        if(input.revision!==state.revision)return json(res,409,{error:'Draft changed. Reload first.'});
        const revision=state.history.find(item=>item.id===input.id);if(!revision)throw new Error('Revision not found.');
        state.draft=structuredClone(revision.content);hydrateProducts(state.draft);state.revision++;audit(user,'Restored a previous draft');await persist();return json(res,200,{revision:state.revision});
      }
      if(pathname==='/api/admin/users'&&req.method==='POST'){requireRole(user,['Owner']);const input=await body(req);const created=makeUser(input);state.users.push(created);audit(user,`Added ${created.role}: ${created.email}`);await persist();return json(res,201,{users:state.users.map(publicUser)});}
      if(pathname==='/api/admin/users'&&req.method==='PATCH') {
        requireRole(user,['Owner']);const input=await body(req);const target=state.users.find(item=>item.id===input.id);if(!target)throw new Error('User not found.');
        if(target.id===user.id)throw new Error('Your current owner account cannot be changed here.');
        if(input.remove)state.users=state.users.filter(item=>item.id!==target.id);
        else {if(!roles.includes(input.role))throw new Error('Invalid role.');target.role=input.role;target.areas=Array.isArray(input.areas)?input.areas.filter(area=>sections.includes(area)):null;}
        for(const [key,value]of sessions)if(value.userId===target.id)sessions.delete(key);
        audit(user,`Updated access for ${target.email}`);await persist();return json(res,200,{users:state.users.map(publicUser)});
      }
      if(pathname==='/api/admin/upload'&&req.method==='POST') {
        if(!allowed(user).includes('media'))return json(res,403,{error:'Media editing is not permitted.'});
        const input=await body(req);const bytes=Buffer.from(input.data||'','base64');
        if(!bytes.length||bytes.length>5*1024*1024)throw new Error('Choose an image smaller than 5 MB.');
        let extension;
        if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))extension='png';
        else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)extension='jpg';
        else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')extension='webp';
        else throw new Error('Only PNG, JPEG and WebP images are supported.');
        await mkdir(path.join(root,'images/uploads'),{recursive:true});const file=randomBytes(16).toString('hex')+'.'+extension;
        await writeFile(path.join(root,'images/uploads',file),bytes);audit(user,'Uploaded a media image');await persist();return json(res,201,{id:file,url:'images/uploads/'+file,alt:String(input.alt||'').slice(0,300),folder:'Uploads'});
      }
      return json(res,404,{error:'Unknown admin action.'});
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
    let requested=decodeURIComponent(pathname);
    if(requested.includes('\\'))return json(res,404,{error:'Not found.'});
    if(requested==='/'||requested==='/admin'||requested==='/admin/')requested=requested==='/'?'/index.html':'/admin/index.html';
    const lower=requested.toLowerCase();
    if(requested.split('/').some(segment=>segment.startsWith('.'))||lower.startsWith('/admin/server/')||lower==='/admin/seed.json'||lower==='/package-lock.json'||lower.startsWith('/node_modules/'))return json(res,404,{error:'Not found.'});
    const file=path.resolve(root,'.'+requested);
    if(!file.startsWith(root+path.sep))return json(res,403,{error:'Not found.'});
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
  } catch(error) {json(res,error.code==='ENOENT'?404:error.status||400,{error:error.code==='ENOENT'?'Not found.':error.message});}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`LeShelter website: http://127.0.0.1:${port}\nAdmin dashboard: http://127.0.0.1:${port}/admin/\nCreate your owner account on the first visit. Data stays in ${dataDir}`));
