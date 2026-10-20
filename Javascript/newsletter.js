(() => {
  document.addEventListener('submit', async event => {
    const form=event.target.closest('[data-newsletter-form]');
    if(!form)return;
    event.preventDefault();
    if(!form.reportValidity())return;
    const button=form.querySelector('button[type="submit"]'),status=form.querySelector('.newsletter-status');
    if(button.disabled)return;
    button.disabled=true;status.textContent='Subscribing...';delete status.dataset.error;
    try{
      const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value.trim()}),signal:AbortSignal.timeout(15000)});
      let result;try{result=await response.json();}catch{throw new Error('Subscriptions are unavailable right now. Please try again later.');}
      if(!response.ok)throw new Error(result.error||'Could not subscribe. Please try again.');
      status.textContent='Thank you! You are subscribed to our newsletter.';form.reset();
    }catch(error){status.dataset.error='true';status.textContent=error.name==='TimeoutError'?'The request timed out. Please try again.':error.message;}
    finally{button.disabled=false;}
  });
})();
