const number=value=>Number(value)||0;
const southAfricanParts=value=>{const parts=new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));const get=type=>parts.find(part=>part.type===type)?.value||'';return{day:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour'))}};
function summarize(events=[],feedback=[]){
  const searches=events.filter(x=>x.event_type==='search'),routes=events.filter(x=>x.event_type==='route');
  const countBy=(rows,key)=>rows.reduce((result,row)=>{const value=key(row);result[value]=(result[value]||0)+1;return result},{});
  const dailyMap={};
  events.forEach(event=>{const day=southAfricanParts(event.created_at).day;dailyMap[day]??={day,searches:0,routes:0};dailyMap[day][event.event_type==='route'?'routes':'searches']++});
  const queryCounts=countBy(searches,row=>String(row.query).toLowerCase());
  const topSearches=Object.entries(queryCounts).map(([query,count])=>({query,searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,8);
  const missingCounts=countBy(searches.filter(x=>number(x.match_count)===0),row=>String(row.query).toLowerCase());
  const missingSearches=Object.entries(missingCounts).map(([query,count])=>({query,searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,10);
  const hourCounts=countBy(searches,row=>southAfricanParts(row.created_at).hour);
  const hourly=Object.entries(hourCounts).map(([hour,count])=>({hour:Number(hour),searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,6);
  const feedbackCounts=countBy(feedback,row=>row.event_type),notFound=countBy(feedback.filter(x=>x.event_type==='not_found'),row=>String(row.product_name||'Unknown').toLowerCase());
  const notFoundProducts=Object.entries(notFound).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,8);
  return{summary:{searches:searches.length,shoppers:new Set([...events,...feedback].map(x=>x.session_id)).size,routes:routes.length,routedItems:routes.reduce((sum,x)=>sum+number(x.item_count),0),found:number(feedbackCounts.found),notFound:number(feedbackCounts.not_found),completed:number(feedbackCounts.route_complete)},daily:Object.values(dailyMap).sort((a,b)=>a.day.localeCompare(b.day)).slice(-14),topSearches,missingSearches,hourly,notFoundProducts};
}
module.exports={summarize};
