const express=require('express');
const db=require('../config/db');
const {optimize}=require('../utils/routeOptimizer');
const {id}=require('../utils/security');
const router=express.Router();
const number=value=>Number(value)||0;

async function storeMap(id){
  const [aisles,sections,entrances,rawProducts]=await Promise.all([
    db.all('SELECT * FROM aisles WHERE supermarket_id=? ORDER BY sort_order,code',[id]),
    db.all('SELECT * FROM aisle_sections WHERE supermarket_id=? ORDER BY aisle_id,side,sort_order,name',[id]),
    db.all('SELECT * FROM entrances WHERE supermarket_id=? ORDER BY sort_order',[id]),
    db.all('SELECT p.*,a.code aisle_code,a.name aisle_name,s.name section_name FROM products p LEFT JOIN aisles a ON a.id=p.aisle_id LEFT JOIN aisle_sections s ON s.id=p.section_id WHERE p.supermarket_id=? AND p.available=1 AND p.stock>0 ORDER BY p.category,p.name',[id])
  ]);
  return{aisles,sections,entrances,products:rawProducts.map(product=>({...product,price:number(product.price),stock:number(product.stock),x:number(product.x),y:number(product.y)}))};
}

router.get('/',async(_req,res)=>res.render('index',{title:'Semausu',supermarkets:await db.all("SELECT id,name,slug,address FROM supermarkets WHERE status='active' ORDER BY name")}));
router.get('/supermarkets/:slug',async(req,res)=>{const supermarket=await db.get("SELECT * FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).render('error',{title:'Supermarket not found',message:'This supermarket is unavailable.'});res.render('customer-navigation',{title:supermarket.name,supermarket,map:await storeMap(supermarket.id)});});
router.post('/api/supermarkets/:slug/search-events',async(req,res)=>{const supermarket=await db.get("SELECT id FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const sessionId=String(req.body.sessionId||'').slice(0,80),searches=Array.isArray(req.body.searches)?req.body.searches.slice(0,100):[];if(!sessionId)return res.status(400).json({error:'Session is required'});for(const search of searches){const query=String(search.query||'').trim().slice(0,120);if(query)await db.run('INSERT INTO shopping_events(id,supermarket_id,session_id,event_type,query,match_count) VALUES(?,?,?,?,?,?)',[id(),supermarket.id,sessionId,'search',query,Math.max(0,Number(search.matchCount)||0)])}res.json({ok:true});});
router.post('/api/supermarkets/:slug/feedback',async(req,res)=>{const supermarket=await db.get("SELECT id FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const allowed=['found','not_found','skipped','route_complete'],eventType=String(req.body.eventType),sessionId=String(req.body.sessionId||'').slice(0,80);if(!allowed.includes(eventType)||!sessionId)return res.status(400).json({error:'Invalid feedback'});let product=null;if(req.body.productId)product=await db.get('SELECT id,name FROM products WHERE id=? AND supermarket_id=?',[String(req.body.productId),supermarket.id]);await db.run('INSERT INTO shopping_feedback(id,supermarket_id,session_id,event_type,product_id,product_name) VALUES(?,?,?,?,?,?)',[id(),supermarket.id,sessionId,eventType,product?.id||null,String(product?.name||req.body.productName||'').slice(0,160)]);res.json({ok:true});});
router.post('/api/supermarkets/:slug/route',async(req,res)=>{const supermarket=await db.get("SELECT * FROM supermarkets WHERE slug=? AND status='active'",[req.params.slug]);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const map=await storeMap(supermarket.id),ids=Array.isArray(req.body.productIds)?req.body.productIds.map(String):[],entrance=map.entrances.find(x=>x.id===String(req.body.entranceId))||map.entrances[0];if(!entrance)return res.status(400).json({error:'This store has not configured an entrance yet'});const selected=map.products.filter(product=>ids.includes(String(product.id)));if(!selected.length)return res.status(400).json({error:'Choose at least one matched product'});const sessionId=String(req.body.sessionId||'anonymous').slice(0,80);await db.run("INSERT INTO shopping_events(id,supermarket_id,session_id,event_type,item_count,metadata) VALUES(?,?,?,?,?,?)",[id(),supermarket.id,sessionId,'route',selected.length,JSON.stringify({entrance:entrance.name,productIds:selected.map(x=>x.id)})]);res.json({start:entrance,stops:optimize(entrance,selected)});});
module.exports=router;
