const crypto=require('crypto');
const randomToken=(bytes=32)=>crypto.randomBytes(bytes).toString('base64url');
const tokenHash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const id=()=>crypto.randomUUID();
const slug=value=>String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
module.exports={randomToken,tokenHash,id,slug};
