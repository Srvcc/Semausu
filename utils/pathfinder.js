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
  const blocked=new Set();
  for(const item of obstacles){const gap=10,minX=Math.ceil((Number(item.x)-gap)/cell),maxX=Math.floor((Number(item.x)+Number(item.width)+gap)/cell),minY=Math.ceil((Number(item.y)-gap)/cell),maxY=Math.floor((Number(item.y)+Number(item.height)+gap)/cell);for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(x>=0&&y>=0&&x<cols&&y<rows)blocked.add(key(x,y))}
  const nearestOpen=origin=>{if(!blocked.has(key(origin.x,origin.y)))return origin;for(let radius=1;radius<Math.max(cols,rows);radius++)for(let x=Math.max(0,origin.x-radius);x<=Math.min(cols-1,origin.x+radius);x++)for(let y=Math.max(0,origin.y-radius);y<=Math.min(rows-1,origin.y+radius);y++)if((Math.abs(x-origin.x)===radius||Math.abs(y-origin.y)===radius)&&!blocked.has(key(x,y)))return{x,y};return null};
  const rawSource=toGrid(start),rawTarget=toGrid(end),sourceWasBlocked=blocked.has(key(rawSource.x,rawSource.y)),targetWasBlocked=blocked.has(key(rawTarget.x,rawTarget.y)),source=nearestOpen(rawSource),target=nearestOpen(rawTarget);
  if(!source||!target)return[];
  const open=[source],came=new Map(),g=new Map([[key(source.x,source.y),0]]),seen=new Set();
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  while(open.length){open.sort((a,b)=>(g.get(key(a.x,a.y))+distance(a,target))-(g.get(key(b.x,b.y))+distance(b,target)));const current=open.shift(),currentKey=key(current.x,current.y);if(seen.has(currentKey))continue;seen.add(currentKey);if(current.x===target.x&&current.y===target.y){const path=[target];let cursor=currentKey;while(came.has(cursor)){const previous=came.get(cursor);path.push(previous);cursor=key(previous.x,previous.y)}const gridPath=path.reverse().map(fromGrid),safeStart=sourceWasBlocked?gridPath[0]:{x:Number(start.x),y:Number(start.y)},safeEnd=targetWasBlocked?gridPath.at(-1):{x:Number(end.x),y:Number(end.y)};return simplify([safeStart,...gridPath,safeEnd])}for(const [dx,dy] of directions){const next={x:current.x+dx,y:current.y+dy},nextKey=key(next.x,next.y);if(next.x<0||next.y<0||next.x>=cols||next.y>=rows||blocked.has(nextKey))continue;const tentative=g.get(currentKey)+1;if(tentative<(g.get(nextKey)??Infinity)){came.set(nextKey,current);g.set(nextKey,tentative);open.push(next)}}}
  return[];
}

function buildRoutePath(start,stops,obstacles,width,height){let current=start,path=[{x:Number(start.x),y:Number(start.y)}];for(const stop of stops){const segment=findPath(current,stop,obstacles,width,height);if(!segment.length)return[];path.push(...segment.slice(1));current=stop}return simplify(path)}
module.exports={findPath,buildRoutePath};
