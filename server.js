require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const db = require('./config/db');
const customerRoutes = require('./routes/customerRoutes');
const supermarketRoutes = require('./routes/supermarketRoutes');

const app = express();
const port = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/', customerRoutes);
app.use('/supermarket', supermarketRoutes);
app.use((_req, res) => res.status(404).render('error', { title: 'Not found', message: 'That page does not exist.' }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).render('error', { title: 'Something went wrong', message: 'Please try again.' }); });

db.initialize().then(() => app.listen(port, () => console.log(`Masolies running at http://localhost:${port}`))).catch(error => {
  console.error('Database initialization failed', error);
  process.exit(1);
});
module.exports = app;
