import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

test('authenticated roles, draft revisions, publishing and private files',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'leshelter-admin-'));
 const origin='http://127.0.0.1:4797';
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{env:{...process.env,PORT:'4797',LESHELTER_ADMIN_DATA:directory,LESHELTER_ADMIN_PUBLISH_FILE:path.join(directory,'published.js')},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(String(chunk).includes('Admin dashboard'))resolve();});child.once('error',reject);child.once('exit',code=>reject(new Error('Server exited '+code)));setTimeout(()=>reject(new Error('Server startup timed out')),10000).unref();});
  const request=async(route,{method='GET',data,auth,csrf=true}={})=>{
   const response=await fetch(origin+'/api/admin/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Cookie:auth.cookie,...(csrf?{'X-CSRF-Token':auth.csrf}:{})}:{})},body:data?JSON.stringify(data):undefined});
   return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  assert.equal((await request('state')).status,401);
  assert.equal((await request('links')).status,401);
  const setup=await request('setup',{method:'POST',data:{name:'Test Owner',email:'owner@example.test',password:'a-valid-test-password'}});
  assert.equal(setup.status,201);const owner={cookie:setup.cookie,csrf:setup.data.csrf};
  assert.equal((await request('setup',{method:'POST',data:{}})).status,403);
  assert.equal((await request('publish',{method:'POST',auth:owner,csrf:false,data:{revision:0}})).status,403);
  const original=(await request('state',{auth:owner})).data;
  const inventory=await request('links',{auth:owner});
  assert.equal(inventory.status,200);
  for(const page of original.draft.pages){
   assert.ok(inventory.data.items.some(item=>item.file===page.file&&item.type==='Link'),page.file+' links listed');
   assert.ok(inventory.data.items.some(item=>item.file===page.file&&item.type==='Button'),page.file+' action buttons listed');
  }
  assert.ok(inventory.data.items.some(item=>item.file==='shop.html'&&item.action==='tshirt'));
  assert.ok(inventory.data.items.some(item=>item.file==='contact.html'&&item.type==='Button'));
  // Every page offered by the editor must have a working preview route and
  // matching section/field markers, including pages in the projects folder.
  for(const page of original.draft.pages){
   const response=await fetch(origin+'/'+page.file+'?cms-preview=1');
   assert.equal(response.status,200,page.file+' preview route');
   const html=await response.text();
   assert.match(html,/src="(?:\.\.\/)?admin\/content\.js"/,page.file+' published content');
   assert.match(html,/src="(?:\.\.\/)?Javascript\/cms\.js"/,page.file+' editor runtime');
   assert.ok(page.sections.some(section=>!section.locked&&section.fields.length),page.file+' editable content');
   for(const section of page.sections){
    assert.ok(html.includes(`data-cms-section="${section.id}"`),page.file+' section '+section.id);
    for(const field of section.fields)assert.ok(html.includes(`data-cms-key="${field.key}"`),page.file+' field '+field.key);
   }
  }
  const draft=structuredClone(original.draft);
  const home=draft.pages.find(page=>page.file==='index.html');
  const textSection=home.sections.find(section=>!section.locked&&section.fields.some(field=>field.attribute==='text'));
  const textField=textSection.fields.find(field=>field.attribute==='text');
  const styleKey=['pages',home.id,textSection.id,textField.id].join('.');
  draft.textStyles={[styleKey]:{color:'#123456',fontSize:32,textAlign:'center',fontWeight:'700',fontStyle:'italic',textDecoration:'underline',fontFamily:'Georgia, serif'}};
  const unsafeStyle=structuredClone(draft);unsafeStyle.textStyles[styleKey].color='url(javascript:alert(1))';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:unsafeStyle,revision:0}})).status,400);
  draft.products.push({id:'test-new-product',name:'Foundation scarf',price:55,category:'Community gifts',description:'A new test product.',image:'/images/gallery/image13.webp',imageAlt:'Foundation scarf'});
  draft.products[0].category='Community gifts';
  draft.products[0].image='/images/gallery/image14.webp';
  draft.products[0].colors=[
   {name:'White',hex:'#ffffff',image:'/images/gallery/image13.webp',alt:'White product'},
   {name:'Green',hex:'#15803d',image:'/images/gallery/image14.webp',alt:'Green product'}
  ];
  const unsafeColor=structuredClone(draft);unsafeColor.products[0].colors[0].image='javascript:alert(1)';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:unsafeColor,revision:0}})).status,400);
  const duplicateColor=structuredClone(draft);duplicateColor.products[0].colors[1].name='white';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:duplicateColor,revision:0}})).status,400);
  const duplicate=structuredClone(draft);duplicate.products.push({...duplicate.products[0]});
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:duplicate,revision:0}})).status,400);
  const unsafePhoto=structuredClone(draft);unsafePhoto.products[0].image='javascript:alert(1)';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:unsafePhoto,revision:0}})).status,400);
  draft.pages.find(page=>page.id==='index').sections.find(section=>section.fields.some(field=>field.attribute==='text')).fields.find(field=>field.attribute==='text').value='Updated test heading';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft,revision:0}})).status,200);
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft,revision:0}})).status,409);
  assert.equal((await request('publish',{method:'POST',auth:owner,data:{revision:1}})).status,200);
  assert.match(await readFile(path.join(directory,'published.js'),'utf8'),/Updated test heading/);
  const publishedCatalog=await readFile(path.join(directory,'published.js'),'utf8');
  assert.match(publishedCatalog,/Foundation scarf/);
  assert.match(publishedCatalog,/Community gifts/);
  assert.match(publishedCatalog,/image14.webp/);
  assert.match(publishedCatalog,/Green product/);
  assert.match(publishedCatalog,/#123456/);
  assert.ok(publishedCatalog.includes(textField.id),'Formatting-only fields remain connected when publishing');
  const savedCatalog=(await request('state',{auth:owner})).data.draft.products;
  assert.equal(savedCatalog.length,original.draft.products.length+1);
  assert.deepEqual(savedCatalog[0].colors,draft.products[0].colors);
  assert.equal((await request('users',{method:'POST',auth:owner,data:{name:'Viewer',email:'viewer@example.test',password:'another-test-password',role:'Viewer'}})).status,201);
  const login=await request('login',{method:'POST',data:{email:'viewer@example.test',password:'another-test-password'}});
  const viewer={cookie:login.cookie,csrf:login.data.csrf};
  assert.equal((await request('draft',{method:'PUT',auth:viewer,data:{draft,revision:1}})).status,403);
  assert.equal((await request('publish',{method:'POST',auth:viewer,data:{revision:1}})).status,403);
  assert.equal((await request('users',{method:'POST',auth:viewer,data:{}})).status,403);
  await request('users',{method:'POST',auth:owner,data:{name:'Editor',email:'editor@example.test',password:'another-test-password',role:'Editor'}});
  const editorLogin=await request('login',{method:'POST',data:{email:'editor@example.test',password:'another-test-password'}});
  const editor={cookie:editorLogin.cookie,csrf:editorLogin.data.csrf};
  const invalid=structuredClone(draft);invalid.theme.primary='#123456';
  assert.equal((await request('draft',{method:'PUT',auth:editor,data:{draft:invalid,revision:1}})).status,403);
  const restrictedProduct=structuredClone(draft);restrictedProduct.products[0].category='Restricted change';
  assert.equal((await request('draft',{method:'PUT',auth:editor,data:{draft:restrictedProduct,revision:1}})).status,403);
  const restrictedFormat=structuredClone(draft);restrictedFormat.textStyles['products.tshirt.name']={fontSize:44};
  assert.equal((await request('draft',{method:'PUT',auth:editor,data:{draft:restrictedFormat,revision:1}})).status,403);
  const unsafe=structuredClone(draft);unsafe.navigation[0].url='javascript:alert(1)';
  assert.equal((await request('draft',{method:'PUT',auth:owner,data:{draft:unsafe,revision:1}})).status,400);
  assert.equal((await request('submit',{method:'POST',auth:editor,data:{}})).status,200);
  const current=(await request('state',{auth:owner})).data;
  assert.ok(current.audit.some(item=>item.action.includes('Submitted')));
  assert.equal((await request('restore',{method:'POST',auth:owner,data:{id:current.history[0].id,revision:1}})).status,200);
  for(const file of ['/.admin/state.json','/admin/server/server.mjs','/admin/seed.json'])assert.equal((await fetch(origin+file)).status,404);
  const stored=await readFile(path.join(directory,'state.json'),'utf8');assert.ok(!stored.includes('a-valid-test-password'));
  assert.equal((await fetch(origin+'/admin/')).status,200);
  assert.equal((await fetch(origin+'/about.html')).status,200);
  assert.match((await fetch(origin+'/about.html')).headers.get('content-security-policy'),/frame-ancestors 'self'/);
 }finally{
  child.kill();await new Promise(resolve=>child.once('exit',resolve));
  await rm(directory,{recursive:true,force:true});
 }
});
