const express=require("express");
const crypto=require("crypto");
const {Pool}=require("pg");
const app=express();
app.use(express.json({limit:"50mb"}));
const secret=process.env.SESSION_SECRET||"change-me";
function sign(v){return crypto.createHmac("sha256",secret).update(v).digest("hex")}
function hasAdminEntry(req){const c=req.headers.cookie||"";const m=c.match(/admin_entry=([^;]+)/);return m&&m[1]===sign("entry")}
app.get(process.env.ADMIN_PATH||"/admin-entry-hidden",(req,res)=>{res.setHeader("Set-Cookie",`admin_entry=${sign("entry")}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=2592000`);res.redirect("/")});
app.use(express.static("public"));
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
function isAdmin(req){const c=req.headers.cookie||"";const m=c.match(/admin=([^;]+)/);return m&&m[1]===sign("admin")}
function auth(req,res,next){if(!isAdmin(req))return res.status(401).json({error:"로그인이 필요합니다."});next()}
async function init(){await pool.query(`CREATE TABLE IF NOT EXISTS pokemon(id SERIAL PRIMARY KEY,name TEXT NOT NULL,cp INTEGER,iv TEXT,type TEXT,note TEXT,image TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`);await pool.query("ALTER TABLE pokemon ADD COLUMN IF NOT EXISTS level INTEGER");await pool.query("ALTER TABLE pokemon ADD COLUMN IF NOT EXISTS price INTEGER");await pool.query("ALTER TABLE pokemon ADD COLUMN IF NOT EXISTS images TEXT");await pool.query("CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL DEFAULT '')")}
app.get("/api/notice",async(req,res)=>{try{const r=await pool.query("SELECT value FROM site_settings WHERE key='notice'");res.json(r.rows[0]?.value||"")}catch(e){res.status(500).json({error:"불러오기에 실패했습니다."})}});app.put("/api/notice",auth,async(req,res)=>{try{await pool.query("INSERT INTO site_settings(key,value) VALUES('notice',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[String(req.body.notice||"")]);res.json({ok:true})}catch(e){res.status(500).json({error:"저장에 실패했습니다."})}});app.get("/api/pokemon",async(req,res)=>{try{const r=await pool.query("SELECT * FROM pokemon ORDER BY id DESC");res.json(r.rows)}catch(e){res.status(500).json({error:"불러오기에 실패했습니다."})}});
app.get("/api/admin-entry",(req,res)=>res.json({enabled:hasAdminEntry(req)}));
app.get("/api/me",(req,res)=>res.json({admin:isAdmin(req)}));
app.post("/api/login",(req,res)=>{if(!process.env.ADMIN_PASSWORD)return res.status(500).json({error:"ADMIN_PASSWORD가 설정되지 않았습니다."});if(req.body.password!==process.env.ADMIN_PASSWORD)return res.status(401).json({error:"비밀번호가 틀렸습니다."});res.setHeader("Set-Cookie",`admin=${sign("admin")}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=604800`);res.json({ok:true})});
app.post("/api/logout",(req,res)=>{res.setHeader("Set-Cookie","admin=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0");res.json({ok:true})});
app.post("/api/pokemon",auth,async(req,res)=>{const {name,level,price,type,note,image,images}=req.body;if(!name)return res.status(400).json({error:"포켓몬 이름을 입력하세요."});const r=await pool.query("INSERT INTO pokemon(name,level,price,type,note,image,images) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",[name,level||null,price||null,type||null,note||null,image||null,JSON.stringify(images||[])]);res.json(r.rows[0])});
app.put("/api/pokemon/:id",auth,async(req,res)=>{const {name,level,price,type,note,image,images}=req.body;const r=await pool.query("UPDATE pokemon SET name=$1,level=$2,price=$3,type=$4,note=$5,image=$6,images=$7 WHERE id=$8 RETURNING *",[name,level||null,price||null,type||null,note||null,image||null,JSON.stringify(images||[]),req.params.id]);res.json(r.rows[0]||{})});
app.delete("/api/pokemon/:id",auth,async(req,res)=>{await pool.query("DELETE FROM pokemon WHERE id=$1",[req.params.id]);res.json({ok:true})});
init().then(()=>app.listen(process.env.PORT||3000,"0.0.0.0")).catch(e=>{console.error(e);process.exit(1)});
