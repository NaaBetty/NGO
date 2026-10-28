import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {scryptSync} from 'node:crypto';
import {fileURLToPath} from 'node:url';
test('cloud CMS preserves existing login, sessions, draft and published state across restarts',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'leshelter-cloud-test-'));const store=path.join(directory,'cloud.json');
 const seed=JSON.parse(await readFile(new URL('../admin/seed.json',import.meta.url),'utf8'));
 await writeFile(store,JSON.stringify({version:0,payload:{users:[{id:'owner',name:'Owner',email:'owner@example.test',role:'Owner',areas:null,salt:'test-salt',hash:scryptSync('test-password','test-salt',64).toString('hex')}],draft:seed,published:seed,revision:0,history:[],audit:[]}}));
 let child;
 const start=async()=>{child=spawn(process.execPath,['--import',new URL('./cloud-test-transport.mjs',import.meta.url).href,fileURLToPath(new URL('../admin/server/server.mjs',import.meta.url))],{env:{...process.env,PORT:'4799',CMS_STORAGE:'supabase',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test',TEST_CLOUD_STORE:store},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.on('data',data=>{if(String(data).includes('Admin dashboard'))resolve();});child.stderr.on('data',data=>process.stderr.write(data));child.once('error',reject);child.once('exit',code=>reject(new Error('Exited '+code)));setTimeout(()=>reject(new Error('Startup timed out')),10000).unref();});};
 const stop=async()=>{if(!child||child.exitCode!==null)return;const exit=new Promise(resolve=>child.once('exit',resolve));child.kill();await exit;};
 const origin='http://127.0.0.1:4799';let cookie,csrf;
 const request=async(route,method='GET',body)=>{const response=await fetch(origin+'/api/admin/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {response,data:await response.json()};};
 try{
  await start();assert.equal((await request('state')).response.status,401);
  const login=await request('login','POST',{email:'owner@example.test',password:'test-password'});assert.equal(login.response.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];csrf=login.data.csrf;
  const initial=(await request('state')).data;assert.equal(initial.revision,0);
  initial.draft.theme.primary='#16432a';
  assert.equal((await request('draft','PUT',{revision:0,draft:initial.draft})).response.status,200);
  assert.equal((await request('publish','POST',{revision:1})).response.status,200);
  await stop();await start();
  const resumed=await request('state');assert.equal(resumed.response.status,200);assert.equal(resumed.data.published.theme.primary,'#16432a');assert.equal(resumed.data.revision,1);
  assert.equal((await request('draft','PUT',{revision:0,draft:initial.draft})).response.status,409);
  assert.equal((await request('logout','POST',{})).response.status,200);assert.equal((await request('state')).response.status,401);
 }finally{await stop();assert.ok(directory.startsWith(path.join(tmpdir(),'leshelter-cloud-test-')));await rm(directory,{recursive:true,force:true});}
});
