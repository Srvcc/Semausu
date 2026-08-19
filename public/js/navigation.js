document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-navigation]');
  if(!root)return;
  const button=document.querySelector('#buildRoute');
  button.addEventListener('click',async()=>{
    const productIds=[...document.querySelectorAll('.menu-item input:checked')].map(input=>Number(input.value));
    if(!productIds.length)return alert('Select at least one product.');
    const original=button.textContent;
    button.disabled=true;
    button.classList.add('is-loading');
    button.textContent='Building route…';
    try{
      const response=await fetch(`/api/supermarkets/${root.dataset.slug}/route`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entranceId:Number(document.querySelector('#entrance').value),productIds})});
      if(!response.ok)throw new Error('Route request failed');
      const route=await response.json();
      document.querySelector('#routeLine').setAttribute('points',[route.start,...route.stops].map(point=>`${point.x},${point.y}`).join(' '));
      document.querySelector('#routeStops').innerHTML=route.stops.map(stop=>`<li><b>${escapeHtml(stop.name)}</b><small>${escapeHtml(`${stop.aisle_code||''}, bay ${stop.bay}, ${stop.shelf}`)}</small></li>`).join('');
      button.textContent='Route ready ✓';
      button.classList.remove('is-loading');
      await new Promise(resolve=>setTimeout(resolve,1200));
    }catch(error){
      button.textContent='Try again';
      button.classList.remove('is-loading');
      alert('We could not build the route. Please try again.');
      await new Promise(resolve=>setTimeout(resolve,1200));
    }finally{
      button.disabled=false;
      button.classList.remove('is-loading');
      button.textContent=original;
    }
  });
});
function escapeHtml(value){const node=document.createElement('span');node.textContent=value;return node.innerHTML;}
