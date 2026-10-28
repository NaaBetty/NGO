import {cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
for(const folder of ['css','Javascript','images','projects'])await cp(path.join(root,folder),path.join(out,folder),{recursive:true});
for(const file of ['index.html','about.html','contact.html','donate.html','gallery.html','projects.html','shop.html','verify.html','_headers'])await cp(path.join(root,file),path.join(out,file));
await mkdir(path.join(out,'admin'),{recursive:true});
for(const file of ['index.html','members.html','app.js','style.css','content.js'])await cp(path.join(root,'admin',file),path.join(out,'admin',file));
console.log('Built public website in dist; private CMS data and environment files excluded.');
