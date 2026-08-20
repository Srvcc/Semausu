document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-workspace]');
  if(!root)return;

  const tabs=[...root.querySelectorAll('[data-workspace-tab]')],views=[...root.querySelectorAll('[data-workspace-view]')];
  const show=name=>{const valid=views.some(view=>view.dataset.workspaceView===name)?name:'overview';tabs.forEach(tab=>tab.classList.toggle('is-active',tab.dataset.workspaceTab===valid));views.forEach(view=>view.hidden=view.dataset.workspaceView!==valid);history.replaceState(null,'',`#${valid}`)};
  tabs.forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.workspaceTab)));
  show(location.hash.slice(1)||'overview');

  const aisleSelect=root.querySelector('[data-product-aisle]'),sideSelect=root.querySelector('[data-product-side]'),sectionSelect=root.querySelector('[data-product-section]');
  const filterSections=()=>{if(!sectionSelect)return;const aisle=aisleSelect.value,side=sideSelect.value;[...sectionSelect.options].forEach((option,index)=>{if(!index)return;option.hidden=option.dataset.aisle!==aisle||option.dataset.side!==side});if(sectionSelect.selectedOptions[0]?.hidden)sectionSelect.value=''};
  aisleSelect?.addEventListener('change',filterSections);sideSelect?.addEventListener('change',filterSections);filterSections();

  const sectionForm=root.querySelector('[data-section-form]'),sectionAisle=root.querySelector('[data-section-aisle]');
  const updateSectionAction=()=>{if(sectionForm)sectionForm.action=sectionAisle?.value?`/workspace/aisles/${sectionAisle.value}/sections`:''};
  sectionAisle?.addEventListener('change',updateSectionAction);updateSectionAction();

  const svg=root.querySelector('[data-floor-canvas]');
  if(!svg)return;
  const stage=root.querySelector('[data-floor-stage]'),groups=[...svg.querySelectorAll('[data-aisle-id]')],selectedEmpty=root.querySelector('[data-selected-empty]'),selectedFields=root.querySelector('[data-selected-fields]'),selectedName=root.querySelector('[data-selected-name]'),fields=Object.fromEntries([...root.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input]));
  let selected=null,interaction=null,zoom=1;
  const baseView={width:svg.viewBox.baseVal.width,height:svg.viewBox.baseVal.height};
  const point=event=>{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
  const values=group=>({x:Number(group.dataset.x),y:Number(group.dataset.y),width:Number(group.dataset.width),height:Number(group.dataset.height)});
  const render=group=>{const value=values(group),rect=group.querySelector('.aisle-body'),texts=group.querySelectorAll('text'),handle=group.querySelector('.resize-handle');group.setAttribute('transform',`translate(${value.x} ${value.y})`);rect.setAttribute('width',value.width);rect.setAttribute('height',value.height);texts[0]?.setAttribute('x',value.width/2);texts[0]?.setAttribute('y',value.height/2);texts[1]?.setAttribute('x',value.width/2);texts[2]?.setAttribute('x',value.width/2);texts[2]?.setAttribute('y',value.height+15);if(texts[3])texts[3].setAttribute('transform',`translate(-9 ${value.height/2}) rotate(-90)`);if(texts[4])texts[4].setAttribute('transform',`translate(${value.width+12} ${value.height/2}) rotate(90)`);handle.setAttribute('cx',value.width);handle.setAttribute('cy',value.height);if(group===selected)Object.entries(fields).forEach(([key,input])=>input.value=value[key])};
  const select=group=>{selected?.classList.remove('is-selected');selected=group;selected?.classList.add('is-selected');selectedEmpty.hidden=Boolean(selected);selectedFields.hidden=!selected;if(selected){selectedName.textContent=selected.querySelector('.aisle-code')?.textContent||'Aisle';const deleteForm=root.querySelector('[data-delete-aisle]');if(deleteForm)deleteForm.action=`/workspace/aisles/${selected.dataset.aisleId}/delete`;render(selected)}};
  groups.forEach(group=>{group.addEventListener('pointerdown',event=>{event.preventDefault();select(group);const start=point(event),initial=values(group),resize=event.target.classList.contains('resize-handle');interaction={group,start,initial,resize};svg.setPointerCapture?.(event.pointerId)})});
  svg.addEventListener('pointermove',event=>{if(!interaction)return;const current=point(event),dx=current.x-interaction.start.x,dy=current.y-interaction.start.y,{group,initial,resize}=interaction;if(resize){group.dataset.width=Math.max(60,Math.round(initial.width+dx));group.dataset.height=Math.max(60,Math.round(initial.height+dy))}else{group.dataset.x=Math.max(0,Math.round(initial.x+dx));group.dataset.y=Math.max(0,Math.round(initial.y+dy))}render(group)});
  const stop=()=>interaction=null;svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  Object.entries(fields).forEach(([key,input])=>input.addEventListener('input',()=>{if(!selected)return;selected.dataset[key]=Math.max(key==='width'||key==='height'?60:0,Number(input.value)||0);render(selected)}));
  root.querySelector('[data-zoom-in]')?.addEventListener('click',()=>setZoom(Math.min(2.5,zoom+.2)));
  root.querySelector('[data-zoom-out]')?.addEventListener('click',()=>setZoom(Math.max(.5,zoom-.2)));
  root.querySelector('[data-zoom-reset]')?.addEventListener('click',()=>setZoom(1));
  function setZoom(value){zoom=value;svg.setAttribute('viewBox',`0 0 ${baseView.width/zoom} ${baseView.height/zoom}`);const reset=root.querySelector('[data-zoom-reset]');if(reset)reset.textContent=`${Math.round(zoom*100)}%`}
  root.querySelector('[data-save-layout]')?.addEventListener('click',async event=>{const button=event.currentTarget,original=button.textContent;button.disabled=true;button.classList.add('is-loading');button.textContent='Saving…';try{const response=await fetch('/workspace/layout/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_csrf:root.dataset.csrf,aisles:groups.map(group=>({id:group.dataset.aisleId,...values(group)}))})});if(!response.ok)throw new Error('Save failed');button.classList.remove('is-loading');button.textContent='Saved ✓';setTimeout(()=>{button.textContent=original;button.disabled=false},1400)}catch(error){button.classList.remove('is-loading');button.textContent='Save failed';button.disabled=false}});
});
