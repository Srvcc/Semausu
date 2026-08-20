const ejs=require('ejs');
const path=require('path');
(async()=>{
  const shared={csrf:'test',flashNotice:null,flashError:null,user:{name:'Owner',role:'platform_owner'}};
  const platform=await ejs.renderFile(path.join(__dirname,'..','views','platform.ejs'),{...shared,title:'Platform',stores:[{id:'s1',name:'Market',slug:'market',address:'Road',status:'active'}],users:[],tickets:[],analytics:{summary:{shoppers:12,searches:30,routes:8},daily:[{day:'2026-08-20',searches:30,routes:8}],missing:[{query:'dragon fruit',searches:4,stores:2}],storePerformance:[{name:'Market',slug:'market',shoppers:12,searches:30,routes:8,found:6,notFound:2}]}});
  if(!platform.includes('Platform pulse')||!platform.includes('dragon fruit')||!platform.includes('Platform control')||!platform.includes('Support tickets')||!platform.includes('data-go-back'))throw new Error('Platform analytics or navigation view failed');
  console.log('Owner analytics view rendered');
})().catch(error=>{console.error(error);process.exit(1)});
