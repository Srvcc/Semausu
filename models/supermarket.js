const db = require('../config/db');
async function list() { return db.all('SELECT id,name,slug,address FROM supermarkets WHERE active=1 ORDER BY name'); }
async function findBySlug(slug) { return db.get('SELECT * FROM supermarkets WHERE slug=? AND active=1', [slug]); }
async function map(id) {
  const [aisles, entrances, products] = await Promise.all([
    db.all('SELECT * FROM aisles WHERE supermarket_id=? ORDER BY id', [id]),
    db.all('SELECT * FROM entrances WHERE supermarket_id=? ORDER BY id', [id]),
    db.all('SELECT p.*,a.code AS aisle_code,a.name AS aisle_name FROM products p LEFT JOIN aisles a ON a.id=p.aisle_id WHERE p.supermarket_id=? AND p.available=1 ORDER BY p.category,p.name', [id])
  ]);
  return { aisles, entrances, products };
}
async function createProduct(supermarketId, product) { return db.run('INSERT INTO products(supermarket_id,aisle_id,name,category,sku,price,stock,bay,shelf,x,y) VALUES(?,?,?,?,?,?,?,?,?,?,?)', [supermarketId,product.aisleId||null,product.name,product.category,product.sku,product.price,product.stock,product.bay,product.shelf,product.x,product.y]); }
async function removeProduct(supermarketId, id) { return db.run('DELETE FROM products WHERE id=? AND supermarket_id=?', [id,supermarketId]); }
module.exports = { list, findBySlug, map, createProduct, removeProduct };
