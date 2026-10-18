import {readFile} from 'node:fs/promises';
import path from 'node:path';
const attributes=source=>Object.fromEntries([...source.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match=>[match[1],match[2]??match[3]]));
const decode=text=>text.replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,value)=>{const number=value[0].toLowerCase()==='x'?parseInt(value.slice(1),16):Number(value);return number<=0x10ffff?String.fromCodePoint(number):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[entity]);
export function scanLinks(html,file){
 const source=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 return [...source.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)].map((match,index)=>{
  const attrs=attributes(match[2]);
  const label=decode(match[3].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())||decode(attrs['aria-label']||attrs.title||'Image / icon link');
  return {id:file+'-'+index,file,key:attrs['data-cms-key']||'',type:match[1]==='a'?'Link':'Button',label,href:decode(attrs.href||''),menu:/(?:^|\s)nav-link(?:\s|$)/.test(attrs.class||''),action:attrs['data-action']||attrs['data-category']||attrs['data-product']||attrs.type||'Interactive control'};
 });
}
export async function websiteLinks(root,pages){
 const groups=await Promise.all(pages.map(async page=>scanLinks(await readFile(path.join(root,page.file),'utf8'),page.file)));
 return groups.flat();
}
