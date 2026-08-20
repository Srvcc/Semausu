document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('[data-site-header]');if(!header)return;
  const drawer=header.querySelector('[data-quick-drawer]'),scrim=header.querySelector('[data-menu-scrim]'),toggle=header.querySelector('[data-menu-toggle]');
  const setOpen=open=>{drawer.classList.toggle('is-open',open);drawer.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));scrim.hidden=!open;document.body.classList.toggle('menu-open',open);if(open)drawer.querySelector('a,button')?.focus()};
  toggle.addEventListener('click',()=>setOpen(!drawer.classList.contains('is-open')));header.querySelector('[data-menu-close]').addEventListener('click',()=>setOpen(false));scrim.addEventListener('click',()=>setOpen(false));
  drawer.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>{setOpen(false);if(link.hash==='#support'&&location.pathname==='/platform'){event.preventDefault();[...document.querySelectorAll('h2')].find(item=>item.textContent.trim()==='Tickets')?.closest('section')?.scrollIntoView({behavior:'smooth'});history.replaceState(null,'','#support')}}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
  header.querySelector('[data-go-back]').addEventListener('click',()=>{const sameOrigin=document.referrer&&new URL(document.referrer).origin===location.origin;if(sameOrigin&&history.length>1)history.back();else if(location.pathname.startsWith('/workspace'))location.href='/workspace#overview';else if(location.pathname.startsWith('/platform'))location.href='/platform';else location.href='/'});
});
