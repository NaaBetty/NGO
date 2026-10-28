import {readFile,writeFile} from 'node:fs/promises';
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 if(!String(url).startsWith('https://test.supabase.co'))return originalFetch(url,options);
 const store=JSON.parse(await readFile(process.env.TEST_CLOUD_STORE,'utf8'));
 const data=options.body?JSON.parse(options.body):null;
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status});
 if(String(url).includes('/cms_store?'))return reply([{version:store.version,payload:store.payload}]);
 if(String(url).endsWith('/rpc/cms_rate_limit'))return reply(true);
 if(String(url).endsWith('/rpc/cms_commit')){
  if(data.expected_version!==store.version)return reply({code:'P0001'},400);
  store.payload=data.new_payload;store.version++;await writeFile(process.env.TEST_CLOUD_STORE,JSON.stringify(store));return reply(store.version);
 }
 throw new Error('Unexpected cloud request in integration test.');
};
