(async()=>{
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3191';
  let response=await fetch(base+'/list-your-supermarket');
  let html=await response.text();
  const cookie=response.headers.get('set-cookie').split(';')[0];
  const csrf=html.match(/name="_csrf" value="([^"]+)/)[1];
  const email=`owner-${Date.now()}@example.test`;
  response=await fetch(base+'/list-your-supermarket',{method:'POST',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf,name:'Test Owner',email,password:'StrongPassword123',supermarketName:'Test Market',address:'Test Street',phone:'0110000000'})});
  html=await response.text();
  const code=html.match(/Development code: <b>(\d{6})<\/b>/)?.[1];
  const csrf2=html.match(/name="_csrf" value="([^"]+)/)?.[1];
  if(!code)throw new Error(`Registration failed with ${response.status}`);
  response=await fetch(base+'/verify',{method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf2,email,code})});
  if(response.status!==302)throw new Error(`Verification failed with ${response.status}`);
  response=await fetch(base+'/workspace',{headers:{cookie}});
  html=await response.text();
  if(response.status!==200||!html.includes('SUPERMARKET WORKSPACE'))throw new Error('Workspace access failed');
  console.log('Owner registration, verification and workspace access passed');
})().catch(error=>{console.error(error);process.exit(1)});
