const express=require('express');
const db=require('../config/db');
const {optimize}=require('../utils/routeOptimizer');
const {findPath}=require('../utils/pathfinder');
const {id}=require('../utils/security');
const {checkoutApproach,productApproach,graphPath}=require('../utils/corridorGraph');
const router=express.Router();
const number=value=>Number(value)||0;
const clean=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

async function storeMap(storeId,{includeProducts=true}={}){
  const [aisles,sections,entrances,rawProducts,corridorNodes,corridorEdges,checkouts,approachPoints]=await Promise.all([
    db.all('SELECT * FROM aisles WHERE supermarket_id=? ORDER BY sort_order,code',[storeId]),
    db.all('SELECT * FROM aisle_sections WHERE supermarket_id=? ORDER BY aisle_id,side,sort_order,name',[storeId]),
    db.all('SELECT * FROM entrances WHERE supermarket_id=? ORDER BY sort_order',[storeId]),
    includeProducts?db.all('SELECT p.*,a.code aisle_code,a.name aisle_name,a.x fixture_x,a.y fixture_y,a.width fixture_width,a.height fixture_height,s.name section_name,s.start_percent,s.end_percent FROM products p LEFT JOIN aisles a ON a.id=p.aisle_id LEFT JOIN aisle_sections s ON s.id=p.section_id WHERE p.supermarket_id=? AND p.available=1 AND p.stock>0 ORDER BY p.category,p.name',[storeId]):[],
    db.all('SELECT * FROM corridor_nodes WHERE supermarket_id=?',[storeId]),
    db.all('SELECT * FROM corridor_edges WHERE supermarket_id=?',[storeId]),
    db.all("SELECT * FROM checkouts WHERE supermarket_id=? AND status='open' ORDER BY name",[storeId]),
    db.all('SELECT * FROM approach_points WHERE supermarket_id=?',[storeId])
  ]);
  const products=rawProducts.map(product=>{
    let x=number(product.x),y=number(product.y);
    const savedApproach=approachPoints.find(point=>point.fixture_id===product.aisle_id&&point.side===product.aisle_side&&number(point.bay)===number(product.bay));
    if(savedApproach){x=number(savedApproach.x);y=number(savedApproach.y)}else if(product.aisle_id&&product.fixture_width){
      const start=product.start_percent==null?0:number(product.start_percent)/100,end=product.end_percent==null?1:number(product.end_percent)/100;
      const ratio=product.section_name?(start+end)/2:Math.min(.95,Math.max(.05,(((number(product.bay)-1)%10)+.5)/10));
      const fx=number(product.fixture_x),fy=number(product.fixture_y),fw=number(product.fixture_width),fh=number(product.fixture_height),gap=28;
      if(product.aisle_side==='back'){x=fx+fw*ratio;y=fy+fh+gap}else if(product.aisle_side==='left'){x=fx-gap;y=fy+fh*ratio}else if(product.aisle_side==='right'){x=fx+fw+gap;y=fy+fh*ratio}else{x=fx+fw*ratio;y=fy-gap}
    }
    return{...product,price:number(product.price),stock:number(product.stock),x:Math.round(x),y:Math.round(y)};
  });
  return{aisles,sections,entrances,products,corridorNodes,corridorEdges,checkouts,approachPoints};
}

function groupStops(products){
  const groups=new Map();
  for(const product of products){
    const locationKey=product.section_id||`${product.aisle_id||'unmapped'}:${product.aisle_side}:${Math.round(number(product.x)/35)}:${Math.round(number(product.y)/35)}`;
    if(!groups.has(locationKey))groups.set(locationKey,{id:`stop-${groups.size+1}`,x:number(product.x),y:number(product.y),aisle_code:product.aisle_code,aisle_side:product.aisle_side,section_name:product.section_name,bay:product.bay,shelf:product.shelf,products:[]});
    groups.get(locationKey).products.push({id:product.id,name:product.name,category:product.category,price:product.price,aisle_code:product.aisle_code,aisle_side:product.aisle_side,section_name:product.section_name,bay:product.bay,shelf:product.shelf});
  }
  return[...groups.values()].map(stop=>({...stop,name:stop.products.length===1?stop.products[0].name:`${stop.products.length} items at ${stop.aisle_code||stop.section_name||'this stop'}`}));
}

router.get('/',async(_req,res)=>res.render('index',{title:'Semausu',supermarkets:await db.all("SELECT id,name,slug,address FROM supermarkets WHERE status='active' ORDER BY name")}));
router.get('/supermarkets/:slug',async(req,res)=>{const supermarket=await db.get("SELECT * FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).render('error',{title:'Supermarket not found',message:'This supermarket is unavailable.'});res.render('customer-navigation',{title:supermarket.name,supermarket,map:await storeMap(supermarket.id,{includeProducts:false})});});

router.post('/api/supermarkets/:slug/search',async(req,res)=>{
  const supermarket=await db.get("SELECT id FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});
  const queries=Array.isArray(req.body.queries)?req.body.queries.map(value=>String(value).trim()).filter(Boolean).slice(0,60):[];
  const map=await storeMap(supermarket.id),groups=queries.map(query=>{const keywords=clean(query).split(/\s+/).filter(Boolean),matches=map.products.filter(product=>{const searchable=clean(`${product.name} ${product.category||''} ${product.sku||''} ${product.barcode||''}`);return keywords.every(keyword=>searchable.includes(keyword))}).slice(0,80);return{query,matches}});
  res.json({groups});
});

router.post('/api/supermarkets/:slug/search-events',async(req,res)=>{const supermarket=await db.get("SELECT id FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const sessionId=String(req.body.sessionId||'').slice(0,80),searches=Array.isArray(req.body.searches)?req.body.searches.slice(0,100):[];if(!sessionId)return res.status(400).json({error:'Session is required'});for(const search of searches){const query=String(search.query||'').trim().slice(0,120);if(query)await db.run('INSERT INTO shopping_events(id,supermarket_id,session_id,event_type,query,match_count) VALUES(?,?,?,?,?,?)',[id(),supermarket.id,sessionId,'search',query,Math.max(0,Number(search.matchCount)||0)])}res.json({ok:true});});
router.post('/api/supermarkets/:slug/feedback',async(req,res)=>{const supermarket=await db.get("SELECT id FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const allowed=['found','not_found','skipped','wrong_location','route_complete'],eventType=String(req.body.eventType),sessionId=String(req.body.sessionId||'').slice(0,80);if(!allowed.includes(eventType)||!sessionId)return res.status(400).json({error:'Invalid feedback'});let product=null;if(req.body.productId)product=await db.get('SELECT id,name FROM products WHERE id=? AND supermarket_id=?',[String(req.body.productId),supermarket.id]);if(eventType==='wrong_location'){await db.run('INSERT INTO location_tasks(id,supermarket_id,product_id,product_name,session_id,reason,status) VALUES(?,?,?,?,?,\'wrong_location\',\'open\')',[id(),supermarket.id,product?.id||null,String(product?.name||req.body.productName||'').slice(0,160),sessionId]);return res.json({ok:true,taskCreated:true})}await db.run('INSERT INTO shopping_feedback(id,supermarket_id,session_id,event_type,product_id,product_name) VALUES(?,?,?,?,?,?)',[id(),supermarket.id,sessionId,eventType,product?.id||null,String(product?.name||req.body.productName||'').slice(0,160)]);if(eventType!=='route_complete')await db.run('INSERT INTO route_progress(id,supermarket_id,session_id,stop_index,result,product_count,metadata) VALUES(?,?,?,?,?,?,?)',[id(),supermarket.id,sessionId,Math.max(0,number(req.body.stopIndex)),eventType,Math.max(1,number(req.body.productCount)),JSON.stringify({x:number(req.body.x),y:number(req.body.y)})]);res.json({ok:true});});

router.post('/api/supermarkets/:slug/route',async(req,res)=>{
  const supermarket=await db.get("SELECT * FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});
  const map=await storeMap(supermarket.id),ids=Array.isArray(req.body.productIds)?req.body.productIds.map(String):[],requestedStart=req.body.currentPoint&&Number.isFinite(Number(req.body.currentPoint.x))?{id:'current',name:'Current position',x:number(req.body.currentPoint.x),y:number(req.body.currentPoint.y)}:null,start=requestedStart||map.entrances.find(x=>x.id===String(req.body.entranceId))||map.entrances[0],checkout=map.checkouts.find(x=>x.id===String(req.body.finishId)),finish=checkout?{...checkout,...checkoutApproach(checkout),isCheckout:true}:map.entrances.find(x=>x.id===String(req.body.finishId))||start;
  if(!start)return res.status(400).json({error:'This store has not configured an entrance yet'});
  const selected=map.products.filter(product=>ids.includes(String(product.id)));if(!selected.length)return res.status(400).json({error:'Choose at least one matched product'});
  const ordered=optimize(start,groupStops(selected)),destinations=[...ordered,{id:'finish',name:`Finish at ${finish.name}`,x:number(finish.x),y:number(finish.y),isFinish:true,products:[]}];
  const segments=[];let current=start;
  for(const destination of destinations){let points=graphPath(current,destination,map.corridorNodes,map.corridorEdges);if(!points.length)points=findPath(current,destination,[...map.aisles,...map.checkouts],supermarket.map_width,supermarket.map_height);if(!points.length)return res.status(422).json({error:'No walkable path connects every stop. The store should regenerate walking paths and check corridor closures.'});segments.push({from:{x:number(current.x),y:number(current.y)},to:{x:number(destination.x),y:number(destination.y)},points});current=destination}
  const sessionId=String(req.body.sessionId||'anonymous').slice(0,80);await db.run("INSERT INTO shopping_events(id,supermarket_id,session_id,event_type,item_count,metadata) VALUES(?,?,?,?,?,?)",[id(),supermarket.id,sessionId,'route',selected.length,JSON.stringify({entrance:start.name,finish:finish.name,productIds:selected.map(x=>x.id)})]);
  res.json({start,finish,stops:ordered,segments});
});

module.exports=router;
