const key=(x,y)=>`${x},${y}`;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function simplify(points){
  if(points.length<3)return points;
  const result=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const a=result[result.length-1],b=points[i],c=points[i+1];
    const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
    if(Math.abs(cross)>0.01)result.push(b);
  }
  result.push(points.at(-1));
  return result;
}

function findPath(start,end,obstacles,width,height,cell=20){
  const cols=Math.ceil(Number(width)/cell),rows=Math.ceil(Number(height)/cell);
  const toGrid=point=>({x:Math.max(0,Math.min(cols-1,Math.round(Number(point.x)/cell))),y:Math.max(0,Math.min(rows-1,Math.round(Number(point.y)/cell)))});
  const fromGrid=point=>({x:point.x*cell,y:point.y*cell});
  const source=toGrid(start),target=toGrid(end),blocked=new Set();
  for(const item of obstacles){const gap=14,minX=Math.floor((Number(item.x)-gap)/cell),maxX=Math.ceil((Number(item.x)+Number(item.width)+gap)/cell),minY=Math.floor((Number(item.y)-gap)/cell),maxY=Math.ceil((Number(item.y)+Number(item.height)+gap)/cell);for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(x>=0&&y>=0&&x<cols&&y<rows)blocked.add(key(x,y))}
  blocked.delete(key(source.x,source.y));blocked.delete(key(target.x,target.y));
  const open=[source],came=new Map(),g=new Map([[key(source.x,source.y),0]]),seen=new Set();
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(open.length){open.sort((a,b)=>(g.get(key(a.x,a.y))+distance(a,target))-(g.get(key(b.x,b.y))+distance(b,target)));const current=open.shift(),currentKey=key(current.x,current.y);if(seen.has(currentKey))continue;seen.add(currentKey);if(current.x===target.x&&current.y===target.y){const path=[target];let cursor=currentKey;while(came.has(cursor)){const previous=came.get(cursor);path.push(previous);cursor=key(previous.x,previous.y)}return simplify([{x:Number(start.x),y:Number(start.y)},...path.reverse().slice(1,-1).map(fromGrid),{x:Number(end.x),y:Number(end.y)}])}for(const [dx,dy] of directions){const next={x:current.x+dx,y:current.y+dy},nextKey=key(next.x,next.y);if(next.x<0||next.y<0||next.x>=cols||next.y>=rows||blocked.has(nextKey))continue;if(dx&&dy&&(blocked.has(key(current.x+dx,current.y))||blocked.has(key(current.x,current.y+dy))))continue;const tentative=g.get(currentKey)+(dx&&dy?1.414:1);if(tentative<(g.get(nextKey)??Infinity)){came.set(nextKey,current);g.set(nextKey,tentative);open.push(next)}}}
  return[{x:Number(start.x),y:Number(start.y)},{x:Number(end.x),y:Number(end.y)}];
}

function buildRoutePath(start,stops,obstacles,width,height){let current=start,path=[{x:Number(start.x),y:Number(start.y)}];for(const stop of stops){const segment=findPath(current,stop,obstacles,width,height);path.push(...segment.slice(1));current=stop}return simplify(path)}
module.exports={findPath,buildRoutePath};
