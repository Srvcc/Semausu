const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const databasePath = path.resolve(__dirname, '..', process.env.DATABASE_PATH || './db/supermarket.db');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new sqlite3.Database(databasePath);
function run(sql, params = []) { return new Promise((resolve, reject) => database.run(sql, params, function done(error) { error ? reject(error) : resolve({ id: this.lastID, changes: this.changes }); })); }
function get(sql, params = []) { return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))); }
function exec(sql) { return new Promise((resolve, reject) => database.exec(sql, error => error ? reject(error) : resolve())); }
async function initialize() {
  await exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  const row = await get('SELECT COUNT(*) AS count FROM supermarkets');
  if (!row.count) await exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8'));
}
module.exports = { run, get, all, exec, initialize };
