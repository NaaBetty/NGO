import handler from '../admin/server/server.mjs';
export default function api(req,res){
 const url=new URL(req.url,'http://localhost');
 const route=url.searchParams.get('cms_route')||req.query?.cms_route;
 const publicRoute=url.searchParams.get('public_route')||req.query?.public_route;
 if(typeof route==='string')req.url='/api/admin/'+route;
 else if(publicRoute==='newsletter')req.url='/api/newsletter';
 else if(publicRoute==='member-photo')req.url='/api/member-photo';
 return handler(req,res);
}
