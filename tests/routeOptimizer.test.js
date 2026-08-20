const test = require('node:test');
const assert = require('node:assert/strict');
const { optimize } = require('../utils/routeOptimizer');
const { findPath } = require('../utils/pathfinder');
test('visits the closest stop first', () => {
  const result = optimize({ x: 0, y: 0 }, [{ id: 1, x: 100, y: 0 }, { id: 2, x: 10, y: 0 }]);
  assert.deepEqual(result.map(stop => stop.id), [2, 1]);
});
test('routes around a supermarket fixture instead of crossing it',()=>{
  const obstacle={x:80,y:40,width:80,height:120};
  const path=findPath({x:20,y:100},{x:220,y:100},[obstacle],260,240,20);
  assert.ok(path.length>2,'expected the route to contain turns');
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    for(let step=0;step<=20;step++){
      const ratio=step/20,x=a.x+(b.x-a.x)*ratio,y=a.y+(b.y-a.y)*ratio;
      assert.ok(!(x>=obstacle.x&&x<=obstacle.x+obstacle.width&&y>=obstacle.y&&y<=obstacle.y+obstacle.height),'route crossed the fixture');
    }
  }
});
test('moves an accidentally blocked destination to the nearest walkable path',()=>{
  const obstacle={x:80,y:40,width:80,height:120},path=findPath({x:20,y:20},{x:100,y:100},[obstacle],260,240,20);
  assert.ok(path.length>1);
  assert.ok(path.every(point=>!(point.x>=obstacle.x&&point.x<=obstacle.x+obstacle.width&&point.y>=obstacle.y&&point.y<=obstacle.y+obstacle.height)));
});
