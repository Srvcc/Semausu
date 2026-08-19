const db=require('../config/db');
async function loadUser(req,res,next){try{if(req.session.userId){req.user=await db.get('SELECT * FROM users WHERE id=?',[req.session.userId]);if(!req.user||req.user.status!=='active'){req.session.userId=null;req.user=null}}res.locals.user=req.user||null;next()}catch(error){next(error)}}
function requireUser(req,res,next){if(!req.user)return res.redirect(req.app.locals.staffPortalPath);next()}
const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():res.status(403).render('error',{title:'Access denied',message:'You do not have permission to view this page.'});
module.exports={loadUser,requireUser,roles};
