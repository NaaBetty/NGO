import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {cloudRepository} from '../admin/server/cloud-repository.mjs';
test('ID QR scans back to the full official verification URL',async()=>{
 const value='https://www.leshelterfoundation.org/verify.html#'+'a'.repeat(64);
 const png=PNG.sync.read(await QRCode.toBuffer(value,{width:320,margin:4,errorCorrectionLevel:'M'}));
 const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
 assert.equal(decoded?.data,value);
});
test('cloud repository keeps elevated key in server headers and saves with a version check',async()=>{
 const calls=[];const repo=cloudRepository({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'},async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(7));});
 assert.equal(await repo.save(6,{published:{pages:[]}}),7);
 assert.equal(calls[0].options.headers.apikey,'sb_secret_test');
 assert.equal(JSON.parse(calls[0].options.body).expected_version,6);
 assert.ok(!calls[0].options.body.includes('sb_secret_test'));
});
test('conflicting remote saves fail rather than overwrite another revision',async()=>{
 const repo=cloudRepository({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'},async()=>new Response(JSON.stringify({code:'P0001'}),{status:400}));
 await assert.rejects(repo.save(0,{}),error=>error.status===409);
});
