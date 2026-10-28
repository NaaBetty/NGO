import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
test('member page allows the configured Supabase origin in connect-src',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'leshelter-csp-'));
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{env:{...process.env,CMS_STORAGE:'local',PORT:'4798',LESHELTER_ADMIN_DATA:directory,LESHELTER_ADMIN_PUBLISH_FILE:path.join(directory,'published.js')},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(String(chunk).includes('Admin dashboard'))resolve();});child.once('error',reject);child.once('exit',code=>reject(new Error('Server exited '+code)));setTimeout(()=>reject(new Error('Server startup timed out')),10000).unref();});
  const response=await fetch('http://127.0.0.1:4798/admin/members.html');
  assert.equal(response.status,200);
  const policy=response.headers.get('content-security-policy');
  const connect=policy.split(';').find(rule=>rule.trim().startsWith('connect-src')).trim().split(/\s+/);
  assert.ok(connect.includes('https://iewrvbzgygmpcrlaqsaq.supabase.co'));
  assert.ok(!connect.includes('*'));
 }finally{
  const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'leshelter-csp-'));
  await rm(directory,{recursive:true,force:true});
 }
});
