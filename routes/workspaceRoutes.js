const express=require('express');
const {z}=require('zod');
const db=require('../config/db');
const config=require('../config');
const {requireUser,roles}=require('../middleware/auth');
const {id,randomToken,tokenHash}=require('../utils/security');
const {send}=require('../utils/email');
const {summarize}=require('../utils/analytics');
const {findPath}=require('../utils/pathfinder');
const router=express.Router();
router.use(requireUser);
router.use(roles('owner','manager','staff'));

const sides=['front','back','left','right'];
const number=value=>Number(value)||0;

async function data(storeId){
  const [store,rawProducts,aisles,sections,entrances,team,tickets,events,feedback]=await Promise.all([
    db.get('SELECT * FROM supermarkets WHERE id=?',[storeId]),
    db.all('SELECT p.*,a.code aisle_code FROM products p LEFT JOIN aisles a ON a.id=p.aisle_id WHERE p.supermarket_id=? ORDER BY p.name',[storeId]),
    db.all('SELECT * FROM aisles WHERE supermarket_id=? ORDER BY sort_order,code',[storeId]),
    db.all('SELECT * FROM aisle_sections WHERE supermarket_id=? ORDER BY aisle_id,side,sort_order,name',[storeId]),
    db.all('SELECT * FROM entrances WHERE supermarket_id=? ORDER BY sort_order',[storeId]),
    db.all("SELECT id,name,email,role,status,last_login_at FROM users WHERE supermarket_id=? ORDER BY role,name",[storeId]),
    db.all('SELECT * FROM support_tickets WHERE supermarket_id=? ORDER BY created_at DESC',[storeId]),
    db.all('SELECT event_type,query,match_count,item_count,session_id,created_at FROM shopping_events WHERE supermarket_id=? ORDER BY created_at',[storeId]),
    db.all('SELECT event_type,product_name,session_id,created_at FROM shopping_feedback WHERE supermarket_id=? ORDER BY created_at',[storeId])
  ]);
  const products=rawProducts.map(product=>({...product,price:number(product.price),stock:number(product.stock),x:number(product.x),y:number(product.y)}));
  return{store,products,aisles,sections,entrances,team,tickets,analytics:summarize(events,feedback)};
}

function placement(aisle,side,bay,section){
  if(!aisle)return{x:0,y:0};
  const start=section?number(section.start_percent)/100:0;
  const end=section?number(section.end_percent)/100:1;
  const ratio=Math.min(.95,Math.max(.05,section?(start+end)/2:(((number(bay)-1)%10)+.5)/10));
  const x=number(aisle.x),y=number(aisle.y),width=number(aisle.width),height=number(aisle.height),gap=18;
  if(side==='back')return{x:Math.round(x+width*ratio),y:y+height+gap};
  if(side==='left')return{x:x-gap,y:Math.round(y+height*ratio)};
  if(side==='right')return{x:x+width+gap,y:Math.round(y+height*ratio)};
  return{x:Math.round(x+width*ratio),y:y-gap};
}

router.get('/',async(req,res)=>res.render('workspace',{title:'Store workspace',...(await data(req.user.supermarket_id)),flashNotice:req.query.notice,flashError:req.query.error}));

router.post('/products',async(req,res)=>{
  const b=z.object({name:z.string().min(1),category:z.string().default('General'),sku:z.string().default(''),barcode:z.string().default(''),price:z.coerce.number().min(0),stock:z.coerce.number().int().min(0),aisleId:z.string().optional(),sectionId:z.string().optional(),aisleSide:z.enum(sides).default('front'),bay:z.coerce.number().int().min(1),shelf:z.string().default('Eye level')}).parse(req.body);
  const aisle=b.aisleId?await db.get('SELECT * FROM aisles WHERE id=? AND supermarket_id=?',[b.aisleId,req.user.supermarket_id]):null;
  const section=b.sectionId?await db.get('SELECT * FROM aisle_sections WHERE id=? AND aisle_id=? AND supermarket_id=?',[b.sectionId,b.aisleId,req.user.supermarket_id]):null;
  const point=placement(aisle,b.aisleSide,b.bay,section);
  await db.run('INSERT INTO products(id,supermarket_id,aisle_id,section_id,aisle_side,name,category,sku,barcode,price,stock,bay,shelf,x,y) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id(),req.user.supermarket_id,aisle?.id||null,section?.id||null,b.aisleSide,b.name,b.category,b.sku,b.barcode,b.price,b.stock,b.bay,b.shelf,point.x,point.y]);
  res.redirect('/workspace?notice='+encodeURIComponent(`${b.name} added.`)+'#products');
});
router.post('/products/:id/delete',roles('owner','manager'),async(req,res)=>{await db.run('DELETE FROM products WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);res.redirect('/workspace#products')});
router.get('/products/import-template',roles('owner','manager'),(_req,res)=>{res.type('text/csv').attachment('semausu-product-import.csv').send('Product Name,Barcode,SKU,Category,Price,Stock,Available,Aisle Code,Side,Section,Bay,Shelf\nFull Cream Milk 2L,600100000001,MILK2,Dairy,34.99,20,yes,A1,front,Long-life milk,2,Eye level\n')});
router.post('/products/import',roles('owner','manager'),async(req,res)=>{const rows=Array.isArray(req.body.rows)?req.body.rows.slice(0,10000):[];if(!rows.length)return res.status(400).json({error:'No product rows received'});const [aisles,sections]=await Promise.all([db.all('SELECT * FROM aisles WHERE supermarket_id=?',[req.user.supermarket_id]),db.all('SELECT * FROM aisle_sections WHERE supermarket_id=?',[req.user.supermarket_id])]);let created=0,updated=0,skipped=0;const errors=[];for(let index=0;index<rows.length;index++){const row=rows[index]||{},name=String(row.name||'').trim().slice(0,160);if(!name){skipped++;errors.push(`Row ${index+2}: product name is missing`);continue}const barcode=String(row.barcode||'').trim().slice(0,80),sku=String(row.sku||'').trim().slice(0,80),aisleCode=String(row.aisleCode||'').trim().toLowerCase(),side=sides.includes(String(row.side).toLowerCase())?String(row.side).toLowerCase():'front',aisle=aisles.find(item=>String(item.code).toLowerCase()===aisleCode)||null,sectionName=String(row.section||'').trim().toLowerCase(),section=sections.find(item=>item.aisle_id===aisle?.id&&item.side===side&&String(item.name).toLowerCase()===sectionName)||null,bay=Math.max(1,Number.parseInt(row.bay)||1),point=placement(aisle,side,bay,section),price=Math.max(0,Number(row.price)||0),stock=Math.max(0,Number.parseInt(row.stock)||0),available=['no','false','0','unavailable'].includes(String(row.available).toLowerCase())?0:1;let existing=null;if(barcode)existing=await db.get('SELECT id FROM products WHERE supermarket_id=? AND barcode=?',[req.user.supermarket_id,barcode]);if(!existing&&sku)existing=await db.get('SELECT id FROM products WHERE supermarket_id=? AND sku=?',[req.user.supermarket_id,sku]);const values=[aisle?.id||null,section?.id||null,side,name,String(row.category||'General').slice(0,100),sku,barcode,price,stock,bay,String(row.shelf||'Eye level').slice(0,80),available,point.x,point.y];if(existing){await db.run('UPDATE products SET aisle_id=?,section_id=?,aisle_side=?,name=?,category=?,sku=?,barcode=?,price=?,stock=?,bay=?,shelf=?,available=?,x=?,y=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND supermarket_id=?',[...values,existing.id,req.user.supermarket_id]);updated++}else{await db.run('INSERT INTO products(id,supermarket_id,aisle_id,section_id,aisle_side,name,category,sku,barcode,price,stock,bay,shelf,available,x,y) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id(),req.user.supermarket_id,...values]);created++}}res.json({ok:true,created,updated,skipped,errors:errors.slice(0,30)});});
router.post('/products/bulk-location',roles('owner','manager'),async(req,res)=>{const productIds=(Array.isArray(req.body.productIds)?req.body.productIds:[req.body.productIds]).filter(Boolean).map(String).slice(0,2000),aisle=await db.get('SELECT * FROM aisles WHERE id=? AND supermarket_id=?',[String(req.body.aisleId||''),req.user.supermarket_id]),side=sides.includes(req.body.aisleSide)?req.body.aisleSide:'front',section=req.body.sectionId&&aisle?await db.get('SELECT * FROM aisle_sections WHERE id=? AND aisle_id=? AND supermarket_id=?',[String(req.body.sectionId),aisle.id,req.user.supermarket_id]):null;if(!productIds.length||!aisle)return res.redirect('/workspace?error='+encodeURIComponent('Select products and a valid aisle.')+'#products');for(const productId of productIds){const product=await db.get('SELECT bay FROM products WHERE id=? AND supermarket_id=?',[productId,req.user.supermarket_id]);if(!product)continue;const point=placement(aisle,side,product.bay,section);await db.run('UPDATE products SET aisle_id=?,section_id=?,aisle_side=?,x=?,y=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND supermarket_id=?',[aisle.id,section?.id||null,side,point.x,point.y,productId,req.user.supermarket_id])}res.redirect('/workspace?notice='+encodeURIComponent(`${productIds.length} products assigned.`)+'#products')});

router.post('/aisles',roles('owner','manager'),async(req,res)=>{
  const b=z.object({code:z.string().min(1).max(12),name:z.string().min(2),kind:z.enum(['aisle','fridge','freezer','wall_shelf','produce_table','display','counter','department','service']),width:z.coerce.number().min(60).max(1200),height:z.coerce.number().min(60).max(900)}).parse(req.body);
  const count=await db.get('SELECT COUNT(*) count FROM aisles WHERE supermarket_id=?',[req.user.supermarket_id]);
  const offset=number(count?.count)*35;
  await db.run('INSERT INTO aisles(id,supermarket_id,code,name,kind,x,y,width,height) VALUES(?,?,?,?,?,?,?,?,?)',[id(),req.user.supermarket_id,b.code.toUpperCase(),b.name,b.kind,80+(offset%500),80+(offset%300),b.width,b.height]);
  res.redirect('/workspace?notice='+encodeURIComponent(`${b.code.toUpperCase()} added. Drag it into place and save.`)+'#layout');
});
router.post('/aisles/:id/sections',roles('owner','manager'),async(req,res)=>{
  const b=z.object({name:z.string().min(1).max(80),side:z.enum(sides),startPercent:z.coerce.number().int().min(0).max(99),endPercent:z.coerce.number().int().min(1).max(100)}).refine(value=>value.endPercent>value.startPercent).parse(req.body);
  const aisle=await db.get('SELECT id FROM aisles WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);
  if(!aisle)return res.status(404).render('error',{title:'Aisle not found',message:'The selected aisle is unavailable.'});
  await db.run('INSERT INTO aisle_sections(id,aisle_id,supermarket_id,name,side,start_percent,end_percent) VALUES(?,?,?,?,?,?,?)',[id(),aisle.id,req.user.supermarket_id,b.name,b.side,b.startPercent,b.endPercent]);
  res.redirect('/workspace?notice='+encodeURIComponent(`${b.name} subsection added.`)+'#layout');
});
router.post('/aisles/:id/delete',roles('owner','manager'),async(req,res)=>{await db.run('DELETE FROM aisles WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);res.redirect('/workspace?notice='+encodeURIComponent('Aisle removed. Products from it are now unmapped.')+'#layout')});
router.post('/aisles/:id/rename',roles('owner','manager'),async(req,res)=>{const parsed=z.object({code:z.string().trim().min(1).max(12),name:z.string().trim().min(2).max(100)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Enter a valid code and name'});try{const result=await db.run('UPDATE aisles SET code=?,name=? WHERE id=? AND supermarket_id=?',[parsed.data.code.toUpperCase(),parsed.data.name,req.params.id,req.user.supermarket_id]);if(!result.changes)return res.status(404).json({error:'Floor object not found'});res.json({ok:true,code:parsed.data.code.toUpperCase(),name:parsed.data.name})}catch(error){res.status(409).json({error:'That code is already used on this floor'})}});
router.post('/aisles/:id/duplicate',roles('owner','manager'),async(req,res)=>{const aisle=await db.get('SELECT * FROM aisles WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);if(!aisle)return res.status(404).json({error:'Aisle not found'});const codes=await db.all('SELECT code FROM aisles WHERE supermarket_id=?',[req.user.supermarket_id]),used=new Set(codes.map(item=>String(item.code).toLowerCase()));let copyCode=`${aisle.code} copy`,suffix=2;while(used.has(copyCode.toLowerCase()))copyCode=`${aisle.code} copy ${suffix++}`;await db.run('INSERT INTO aisles(id,supermarket_id,code,name,kind,x,y,width,height) VALUES(?,?,?,?,?,?,?,?,?)',[id(),req.user.supermarket_id,copyCode.slice(0,12),`${aisle.name} copy`,aisle.kind,number(aisle.x)+30,number(aisle.y)+30,aisle.width,aisle.height]);res.json({ok:true})});
router.post('/sections/:id/delete',roles('owner','manager'),async(req,res)=>{await db.run('DELETE FROM aisle_sections WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);res.redirect('/workspace?notice='+encodeURIComponent('Aisle section removed.')+'#layout')});
router.post('/layout/save',roles('owner','manager'),async(req,res)=>{
  const parsed=z.object({aisles:z.array(z.object({id:z.string(),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0),width:z.coerce.number().int().min(60),height:z.coerce.number().int().min(60)})).max(300),entrances:z.array(z.object({id:z.string(),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0)})).max(50).default([])}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid floor-plan data'});
  const store=await db.get('SELECT map_width,map_height FROM supermarkets WHERE id=?',[req.user.supermarket_id]),issues=[];
  for(const item of parsed.data.aisles)if(item.x+item.width>number(store.map_width)||item.y+item.height>number(store.map_height))issues.push(`${item.id}: extends beyond the store boundary`);
  for(let i=0;i<parsed.data.aisles.length;i++)for(let j=i+1;j<parsed.data.aisles.length;j++){const a=parsed.data.aisles[i],b=parsed.data.aisles[j],overlap=a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;if(overlap)issues.push('Two floor objects overlap')}
  const proposedEntrances=parsed.data.entrances;if(proposedEntrances.length>1)for(const entry of proposedEntrances.slice(1))if(!findPath(proposedEntrances[0],entry,parsed.data.aisles,store.map_width,store.map_height).length)issues.push(`${entry.id}: cannot be reached from the main entrance`);
  if(issues.length)return res.status(409).json({error:'The floor plan needs attention before saving.',issues:[...new Set(issues)].slice(0,12)});
  for(const item of parsed.data.aisles){
    const previous=await db.get('SELECT * FROM aisles WHERE id=? AND supermarket_id=?',[item.id,req.user.supermarket_id]);
    if(!previous)continue;
    const dx=item.x-number(previous.x),dy=item.y-number(previous.y);
    await db.run('UPDATE aisles SET x=?,y=?,width=?,height=? WHERE id=? AND supermarket_id=?',[item.x,item.y,item.width,item.height,item.id,req.user.supermarket_id]);
    await db.run('UPDATE products SET x=x+?,y=y+?,updated_at=CURRENT_TIMESTAMP WHERE aisle_id=? AND supermarket_id=?',[dx,dy,item.id,req.user.supermarket_id]);
  }
  for(const entry of parsed.data.entrances)await db.run('UPDATE entrances SET x=?,y=? WHERE id=? AND supermarket_id=?',[entry.x,entry.y,entry.id,req.user.supermarket_id]);
  res.json({ok:true,savedAt:new Date().toISOString()});
});
router.post('/entrances',roles('owner','manager'),async(req,res)=>{const b=z.object({name:z.string().min(2),x:z.coerce.number().min(0),y:z.coerce.number().min(0)}).parse(req.body);await db.run('INSERT INTO entrances(id,supermarket_id,name,x,y) VALUES(?,?,?,?,?)',[id(),req.user.supermarket_id,b.name,b.x,b.y]);res.redirect('/workspace#layout')});
router.post('/layout/entrances/save',roles('owner','manager'),async(req,res)=>{const parsed=z.object({entrances:z.array(z.object({id:z.string(),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0)})).max(50)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid entrance data'});for(const entry of parsed.data.entrances)await db.run('UPDATE entrances SET x=?,y=? WHERE id=? AND supermarket_id=?',[entry.x,entry.y,entry.id,req.user.supermarket_id]);res.json({ok:true})});
router.post('/layout/expand',roles('owner','manager'),async(req,res)=>{const axis=req.body.axis==='height'?'map_height':'map_width',store=await db.get(`SELECT ${axis} value FROM supermarkets WHERE id=?`,[req.user.supermarket_id]),next=Math.min(5000,number(store.value)+200);await db.run(`UPDATE supermarkets SET ${axis}=? WHERE id=?`,[next,req.user.supermarket_id]);res.json({ok:true,value:next})});
router.post('/entrances/:id/delete',roles('owner','manager'),async(req,res)=>{await db.run('DELETE FROM entrances WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);res.redirect('/workspace?notice='+encodeURIComponent('Entrance removed.')+'#layout')});

router.post('/team/invite',roles('owner','manager'),async(req,res)=>{const allowed=req.user.role==='owner'?['manager','staff']:['staff'],role=String(req.body.role);if(!allowed.includes(role))return res.status(403).render('error',{title:'Access denied',message:'You cannot invite that role.'});const email=String(req.body.email||'').trim().toLowerCase();if(await db.get('SELECT id FROM users WHERE email=?',[email]))return res.redirect('/workspace?error='+encodeURIComponent('That email is already registered.')+'#team');const raw=randomToken(),inviteId=id();await db.run('INSERT INTO invitations(id,supermarket_id,invited_by,email,role,token_hash,expires_at) VALUES(?,?,?,?,?,?,?)',[inviteId,req.user.supermarket_id,req.user.id,email,role,tokenHash(raw),new Date(Date.now()+48*3600000).toISOString()]);try{await send({to:email,subject:'Join your supermarket on Semausu',text:`You were invited as ${role}. Accept within 48 hours: ${config.appUrl}/join/${raw}`});return res.redirect('/workspace?notice='+encodeURIComponent(`Invitation sent to ${email}.`)+'#team')}catch(error){console.error('Team invitation failed:',error.message);await db.run('DELETE FROM invitations WHERE id=?',[inviteId]);return res.redirect('/workspace?error='+encodeURIComponent('The invitation email could not be sent. Nothing was saved; please try again.')+'#team')}});
router.post('/team/:id/status',roles('owner','manager'),async(req,res)=>{const target=await db.get('SELECT * FROM users WHERE id=? AND supermarket_id=?',[req.params.id,req.user.supermarket_id]);if(!target||target.role==='owner'||(req.user.role==='manager'&&target.role==='manager'))return res.status(403).render('error',{title:'Access denied',message:'You cannot change this account.'});await db.run('UPDATE users SET status=? WHERE id=?',[req.body.status==='active'?'active':'suspended',target.id]);res.redirect('/workspace#team')});
router.post('/settings',roles('owner','manager'),async(req,res)=>{await db.run('UPDATE supermarkets SET name=?,address=?,phone=?,map_width=?,map_height=? WHERE id=?',[String(req.body.name),String(req.body.address||''),String(req.body.phone||''),Math.max(600,Number(req.body.mapWidth)||1200),Math.max(400,Number(req.body.mapHeight)||760),req.user.supermarket_id]);res.redirect('/workspace?notice='+encodeURIComponent('Store settings saved.')+'#settings')});
router.post('/support',async(req,res)=>{await db.run('INSERT INTO support_tickets(id,supermarket_id,user_id,subject,description,priority) VALUES(?,?,?,?,?,?)',[id(),req.user.supermarket_id,req.user.id,String(req.body.subject),String(req.body.description),['low','normal','high','critical'].includes(req.body.priority)?req.body.priority:'normal']);res.redirect('/workspace?notice='+encodeURIComponent('Support ticket opened.')+'#support')});
module.exports=router;
