const fs=require('fs');
const path=require('path');
const {Pool}=require('pg');
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw new Error('DATABASE_URL is required. Use a dedicated PostgreSQL database.');
let pool;
if(connectionString==='memory://'){const {newDb,DataType}=require('pg-mem');const memory=newDb({autoCreateForeignKeyIndices:true});memory.public.registerFunction({name:'to_timestamp',args:[DataType.text],returns:DataType.timestamptz,implementation:value=>new Date(Number(value)*1000)});pool=new (memory.adapters.createPg().Pool)()}else{pool=new Pool({connectionString,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined,max:15,idleTimeoutMillis:30000})}
function placeholders(sql){let index=0;return sql.replace(/\?/g,()=>`$${++index}`)}
async function run(sql,params=[]){const result=await pool.query(placeholders(sql),params);return{changes:result.rowCount}}
async function get(sql,params=[]){const result=await pool.query(placeholders(sql),params);return result.rows[0]}
async function all(sql,params=[]){const result=await pool.query(placeholders(sql),params);return result.rows}
async function exec(sql){return pool.query(sql)}
async function initialize(){await exec(fs.readFileSync(path.join(__dirname,'..','db','schema.sql'),'utf8'))}
module.exports={pool,run,get,all,exec,initialize};
