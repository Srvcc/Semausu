const {randomToken}=require('../utils/security');
function csrf(req,res,next){if(!req.session.csrf)req.session.csrf=randomToken(24);res.locals.csrf=req.session.csrf;const publicRouteBuilder=req.method==='POST'&&req.path.startsWith('/api/supermarkets/');if(!publicRouteBuilder&&['POST','PUT','PATCH','DELETE'].includes(req.method)&&req.body?._csrf!==req.session.csrf)return res.status(403).render('error',{title:'Request expired',message:'Refresh the page and try again.'});next()}
module.exports={csrf};
