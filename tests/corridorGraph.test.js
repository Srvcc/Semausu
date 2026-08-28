const test=require('node:test');
const assert=require('node:assert/strict');
const {generateNetwork,graphPath,productApproach,checkoutApproach}=require('../utils/corridorGraph');

test('generates corridor edges that do not cross fixtures',()=>{const fixture={x:180,y:100,width:160,height:300},network=generateNetwork([fixture],600,520,[{x:50,y:450},{x:500,y:60}]);assert.ok(network.nodes.length>0);assert.ok(network.edges.length>0);for(const edge of network.edges){const midpoint={x:(edge.from.x+edge.to.x)/2,y:(edge.from.y+edge.to.y)/2};assert.equal(midpoint.x>fixture.x&&midpoint.x<fixture.x+fixture.width&&midpoint.y>fixture.y&&midpoint.y<fixture.y+fixture.height,false)}});

test('routes through an explicit corridor graph',()=>{const nodes=[{id:'a',x:20,y:20},{id:'b',x:20,y:200},{id:'c',x:300,y:200}],edges=[{from_node_id:'a',to_node_id:'b',distance:180,status:'open',direction:'both',customer_allowed:1},{from_node_id:'b',to_node_id:'c',distance:280,status:'open',direction:'both',customer_allowed:1}],path=graphPath({x:15,y:15},{x:310,y:205},nodes,edges);assert.deepEqual(path.slice(1,-1).map(point=>[point.x,point.y]),[[20,20],[20,200],[300,200]])});

test('places product and checkout destinations on their approach sides',()=>{const fixture={x:100,y:100,width:200,height:300};assert.ok(productApproach(fixture,'front',1).y<fixture.y);assert.ok(productApproach(fixture,'right',5).x>fixture.x+fixture.width);assert.ok(checkoutApproach({...fixture,approach_side:'back'}).y>fixture.y+fixture.height)});
