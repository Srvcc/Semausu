function distance(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y)); }
function optimize(start, items) {
  const remaining = [...items], route = [];
  let current = start;
  while (remaining.length) {
    let closest = 0;
    for (let i = 1; i < remaining.length; i += 1) if (distance(current, remaining[i]) < distance(current, remaining[closest])) closest = i;
    current = remaining.splice(closest, 1)[0];
    route.push(current);
  }
  return route;
}
module.exports = { optimize };
