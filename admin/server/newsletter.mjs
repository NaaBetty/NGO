import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
export function newsletterHandler(dataDir){
 let queue=Promise.resolve();const attempts=new Map();
 return async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method!=='POST')return send(405,{error:'Use the subscription form to sign up.'});
  if(req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Same-origin requests are required.'});
  const key=req.socket.remoteAddress,now=Date.now(),record=attempts.get(key);
  if(record&&now-record.at<60000&&record.count>=10)return send(429,{error:'Please wait a minute before trying again.'});
  attempts.set(key,record&&now-record.at<60000?{at:record.at,count:record.count+1}:{at:now,count:1});
  try{
   const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>4096)return send(413,{error:'Subscription request is too large.'});chunks.push(chunk);}
   const input=JSON.parse(Buffer.concat(chunks).toString()),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
   if(email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return send(400,{error:'Please enter a valid email address.'});
   queue=queue.catch(()=>{}).then(async()=>{
    await mkdir(dataDir,{recursive:true});const file=path.join(dataDir,'newsletter.json');let subscribers=[];
    try{subscribers=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(!subscribers.some(item=>item.email===email)){
     subscribers.push({email,subscribedAt:new Date().toISOString(),source:'footer'});
     await writeFile(file+'.tmp',JSON.stringify(subscribers,null,2),{mode:0o600});await rename(file+'.tmp',file);
    }
   });await queue;return send(200,{ok:true});
  }catch{return send(400,{error:'We could not save your subscription. Please try again later.'});}
 };
}
