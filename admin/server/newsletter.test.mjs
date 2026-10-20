import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {newsletterHandler} from './newsletter.mjs';
test('newsletter validates, stores and deduplicates subscriptions',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'leshelter-newsletter-'));
 const handler=newsletterHandler(directory),server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const request=(email,source=origin)=>fetch(origin,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify({email})});
 try{
  assert.equal((await request('friend@example.test','https://another.example')).status,403);
  assert.equal((await request('not-an-email')).status,400);
  assert.equal((await request(' Friend@Example.test ')).status,200);
  assert.equal((await request('friend@example.test')).status,200);
  const saved=JSON.parse(await readFile(path.join(directory,'newsletter.json'),'utf8'));
  assert.equal(saved.length,1);assert.equal(saved[0].email,'friend@example.test');assert.ok(saved[0].subscribedAt);
  for(let i=0;i<7;i++)await request('friend@example.test');
  assert.equal((await request('friend@example.test')).status,429);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));
  await rm(directory,{recursive:true,force:true});
 }
});
