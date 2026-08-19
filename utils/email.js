const nodemailer=require('nodemailer');
const config=require('../config');
let transport;
async function send({to,subject,text}){
  if(!config.smtp.host){if(!config.production){console.log(`[development email] to=${to} subject=${subject}\n${text}`);return}throw new Error('Email delivery is not configured')}
  transport ||= nodemailer.createTransport({host:config.smtp.host,port:config.smtp.port,secure:config.smtp.secure,auth:config.smtp.user?{user:config.smtp.user,pass:config.smtp.pass}:undefined});
  await transport.sendMail({from:config.smtp.from,to,subject,text});
}
module.exports={send};
