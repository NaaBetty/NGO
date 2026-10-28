import {readFile,readdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {cloudRepository} from '../admin/server/cloud-repository.mjs';
const repo=cloudRepository();if(!repo)throw new Error('Configure server-side Supabase credentials in .env first.');
const root=process.cwd();const stateFile=path.join(root,'.admin/state.json');
const source=await readFile(stateFile,'utf8');
const state=JSON.parse(source);
if(!state.users?.some(user=>user.role==='Owner'))throw new Error('Configure a local owner account before migration.');
try {await repo.load();throw new Error('A cloud CMS already exists. Import stopped to avoid overwriting it.');}catch(error){if(!error.message.startsWith('Import the existing CMS'))throw error;}
// A private local backup never enters the public build or command output.
await writeFile(path.join(root,'.admin/pre-supabase-backup.json'),JSON.stringify(state),{mode:0o600,flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
const replacements=new Map();
const uploads=path.join(root,'images/uploads');
for(const name of await readdir(uploads).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
 const file=path.join(uploads,name);if(!(await stat(file)).isFile())continue;
 const ext=path.extname(name).toLowerCase();const type={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[ext];if(!type)continue;
 const bytes=await readFile(file);const destination=createHash('sha256').update(bytes).digest('hex')+ext;
 const url=await repo.upload(destination,bytes,type,true);replacements.set('images/uploads/'+name,url);replacements.set('/images/uploads/'+name,url);
}
function replace(value){if(typeof value==='string')return replacements.get(value)||value;if(Array.isArray(value))return value.map(replace);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replace(v)]));return value;}
const payload=replace(state);delete payload.sessions;
let subscribers=[];try{subscribers=JSON.parse(await readFile(path.join(root,'.admin/newsletter.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
await repo.importSubscribers(subscribers);
if(await readFile(stateFile,'utf8')!==source)throw new Error('Local CMS changed during import. Stop the management server and rerun migration.');
await repo.initialize(payload);
console.log('Migration complete: CMS content, accounts, roles, history, audit, uploaded media and newsletter subscribers. Local files retained.');
