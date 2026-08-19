const production = process.env.NODE_ENV === 'production';
module.exports = {
  production,
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: process.env.SESSION_SECRET || (production ? '' : 'development-only-change-me'),
  staffPortalPath: '/' + String(process.env.STAFF_PORTAL_PATH || 'team-access').replace(/^\/+|\/+$/g,''),
  platformPortalPath: '/' + String(process.env.PLATFORM_PORTAL_PATH || 'platform-access').replace(/^\/+|\/+$/g,''),
  emailApi: { key:process.env.BREVO_API_KEY, senderEmail:process.env.BREVO_SENDER_EMAIL||process.env.SMTP_USER, senderName:process.env.BREVO_SENDER_NAME||'Semausu' },
  smtp: { host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',user:process.env.SMTP_USER,pass:process.env.SMTP_PASS,from:process.env.SMTP_FROM||'Semausu <no-reply@localhost>' }
};
