document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',()=>{
    const button=form.querySelector('button[type="submit"],button:not([type])');
    if(!button||button.disabled)return;
    button.dataset.originalText=button.textContent;
    button.textContent=button.dataset.loadingText||'Please wait…';
    button.classList.add('is-loading');
    button.disabled=true;
    button.setAttribute('aria-busy','true');
  }));
});
