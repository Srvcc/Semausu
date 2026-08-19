const express=require('express');
const Supermarket=require('../models/supermarket');
const {optimize}=require('../utils/routeOptimizer');
const router=express.Router();
router.get('/',async(_req,res)=>res.render('index',{title:'Masolies',supermarkets:await Supermarket.list()}));
router.get('/supermarkets/:slug',async(req,res)=>{const supermarket=await Supermarket.findBySlug(req.params.slug);if(!supermarket)return res.status(404).render('error',{title:'Supermarket not found',message:'This supermarket is unavailable.'});res.render('customer-navigation',{title:supermarket.name,supermarket,map:await Supermarket.map(supermarket.id)});});
router.post('/api/supermarkets/:slug/route',async(req,res)=>{const supermarket=await Supermarket.findBySlug(req.params.slug);if(!supermarket)return res.status(404).json({error:'Supermarket not found'});const map=await Supermarket.map(supermarket.id);const ids=Array.isArray(req.body.productIds)?req.body.productIds.map(Number):[];const entrance=map.entrances.find(entry=>entry.id===Number(req.body.entranceId))||map.entrances[0];res.json({start:entrance,stops:optimize(entrance,map.products.filter(product=>ids.includes(product.id)))});});
module.exports=router;
