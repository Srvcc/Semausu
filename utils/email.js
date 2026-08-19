const nodemailer=require('nodemailer');
const config=require('../config');
let transport;
async function sendWithApi({to,subject,text}){
  const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',signal:AbortSignal.timeout(10000),headers:{accept:'application/json','content-type':'application/json','api-key':config.emailApi.key},body:JSON.stringify({sender:{name:config.emailApi.senderName,email:config.emailApi.senderEmail},to:[{email:to}],subject,textContent:text})});
  if(!response.ok){const detail=await response.text();throw new Error(`Email API rejected the message (${response.status}): ${detail.slice(0,180)}`)}
}
async function send({to,subject,text}){
  if(config.emailApi.key){if(!config.emailApi.senderEmail)throw new Error('Email API sender is not configured');return sendWithApi({to,subject,text})}
  if(!config.smtp.host){if(!config.production){console.log(`[development email] to=${to} subject=${subject}\n${text}`);return}throw new Error('Email delivery is not configured')}
  if(config.production)throw new Error('Email API is not configured. Free Render services block SMTP connections.');
  transport ||= nodemailer.createTransport({host:config.smtp.host,port:config.smtp.port,secure:config.smtp.secure,requireTLS:!config.smtp.secure,family:4,connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,tls:{serverName:config.smtp.host,minVersion:'TLSv1.2'},auth:config.smtp.user?{user:config.smtp.user,pass:config.smtp.pass}:undefined});
  await transport.sendMail({from:config.smtp.from,to,subject,text});
}
module.exports={send};
