import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../Javascript/membership-client.js',import.meta.url),'utf8');
const {createMembershipClient}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const config={url:'https://example.supabase.co',publishableKey:'public-test'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('public verification uses the publishable key without an admin token',async()=>{
 let call;const c=createMembershipClient(config,async(url,options)=>{call={url,options};return response([]);});
 assert.deepEqual(await c.verify('a'.repeat(64)),[]);
 assert.equal(call.options.headers.apikey,'public-test');assert.equal(call.options.headers.Authorization,undefined);
 assert.equal(JSON.parse(call.options.body).token,'a'.repeat(64));
 await assert.rejects(c.list(),/sign in/);
});
test('non-admin sign in cannot read members',async()=>{
 let calls=0;const c=createMembershipClient(config,async()=>response(++calls===1?{access_token:'token',expires_in:3600}:false));
 await assert.rejects(c.signIn('user@example.com','password'),/administrator access/);
 await assert.rejects(c.list(),/sign in/);assert.equal(calls,2);
});
test('authorized admin sends token and signing out clears access',async()=>{
 let calls=[];const c=createMembershipClient(config,async(url,o)=>{calls.push({url,o});return response(url.includes('/token?')?{access_token:'admin-token',expires_in:3600}:url.includes('is_membership_admin')?true:[]);});
 await c.signIn('admin@example.com','password');await c.list();
 assert.equal(calls[2].o.headers.Authorization,'Bearer admin-token');
 await c.signOut();await assert.rejects(c.list(),/sign in/);
});
test('missing migration gives a useful setup error',async()=>{
 const c=createMembershipClient(config,async()=>response({code:'PGRST202'},404));
 await assert.rejects(c.verify('a'.repeat(64)),/database setup is not complete/);
});
test('member photos validate format and update the private storage path after upload',async()=>{
 const calls=[];
 const c=createMembershipClient(config,async(url,options)=>{calls.push({url,options});return response(url.includes('/token?')?{access_token:'admin-token',expires_in:3600}:url.includes('is_membership_admin')?true:{});});
 await c.signIn('admin@example.com','password');
 const file=new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'});
 const path=await c.uploadPhoto('11111111-1111-4111-8111-111111111111',file);
 assert.match(path,/\.png$/);
 assert.ok(calls[2].url.includes('/storage/v1/object/member-photos/'));
 assert.equal(calls[2].options.headers['Content-Type'],'image/png');
 assert.equal(calls[2].options.headers.Authorization,'Bearer admin-token');
 assert.equal(JSON.parse(calls[3].options.body).photo_path,path);
 await assert.rejects(c.uploadPhoto('member',new Blob(['<script>bad</script>'])),/Only PNG/);
});
test('failed photo record updates remove the newly uploaded storage object',async()=>{
 const calls=[];
 const c=createMembershipClient(config,async(url,options)=>{calls.push({url,options});if(options.method==='PATCH')return response({message:'Save rejected'},403);return response(url.includes('/token?')?{access_token:'admin-token',expires_in:3600}:url.includes('is_membership_admin')?true:{});});
 await c.signIn('admin@example.com','password');
 await assert.rejects(c.uploadPhoto('member',new Blob([new Uint8Array([255,216,255])])),/Save rejected/);
 assert.equal(calls.at(-1).options.method,'DELETE');
 assert.ok(JSON.parse(calls.at(-1).options.body).prefixes[0].endsWith('.jpg'));
});
