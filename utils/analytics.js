const number=value=>Number(value)||0;
function summarize(events=[]){
  const searches=events.filter(x=>x.event_type==='search'),routes=events.filter(x=>x.event_type==='route');
  const countBy=(rows,key)=>rows.reduce((result,row)=>{const value=key(row);result[value]=(result[value]||0)+1;return result},{});
  const dailyMap={};
  events.forEach(event=>{const day=new Date(event.created_at).toISOString().slice(0,10);dailyMap[day]??={day,searches:0,routes:0};dailyMap[day][event.event_type==='route'?'routes':'searches']++});
  const queryCounts=countBy(searches,row=>String(row.query).toLowerCase());
  const topSearches=Object.entries(queryCounts).map(([query,count])=>({query,searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,8);
  const missingCounts=countBy(searches.filter(x=>number(x.match_count)===0),row=>String(row.query).toLowerCase());
  const missingSearches=Object.entries(missingCounts).map(([query,count])=>({query,searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,10);
  const hourCounts=countBy(searches,row=>new Date(row.created_at).getHours());
  const hourly=Object.entries(hourCounts).map(([hour,count])=>({hour:Number(hour),searches:count})).sort((a,b)=>b.searches-a.searches).slice(0,6);
  return{summary:{searches:searches.length,shoppers:new Set(events.map(x=>x.session_id)).size,routes:routes.length,routedItems:routes.reduce((sum,x)=>sum+number(x.item_count),0)},daily:Object.values(dailyMap).sort((a,b)=>a.day.localeCompare(b.day)).slice(-14),topSearches,missingSearches,hourly};
}
module.exports={summarize};
