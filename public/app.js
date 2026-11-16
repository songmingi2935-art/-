let items=[],admin=false,editing=null;
const $=id=>document.getElementById(id);
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{"Content-Type":"application/json",...(opt.headers||{})}});const d=await r.json();if(!r.ok)throw Error(d.error||"오류");return d}
async function load(){items=await api("/api/pokemon");render();const me=await api("/api/me");admin=me.admin;updateAdmin()}
function updateAdmin(){$("addBtn").hidden=!admin;$("loginBtn").hidden=admin;$("logoutBtn").hidden=!admin;render()}
function render(){const q=$("search").value.toLowerCase();const t=$("typeFilter").value;const filtered=items.filter(x=>(x.name||"").toLowerCase().includes(q)&&(!t||x.type===t));const types=[...new Set(items.map(x=>x.type).filter(Boolean))];$("typeFilter").innerHTML='<option value="">전체 타입</option>'+types.map(x=>`<option ${x===t?"selected":""}>${x}</option>`).join("");$("grid").innerHTML=filtered.map(x=>`<article class="card">${x.image?`<img src="${x.image}" alt="">`:""}<div class="body"><h3>${esc(x.name)}</h3><div class="meta">CP: ${x.cp??"-"}<br>IV: ${esc(x.iv||"-")}<br>타입: ${esc(x.type||"-")}<br>${esc(x.note||"")}</div>${admin?`<div class="actions"><button onclick="editItem(${x.id})">수정</button><button class="danger" onclick="deleteItem(${x.id})">삭제</button></div>`:""}</div></article>`).join("")||"<p>등록된 포켓몬이 없습니다.</p>"}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
$("search").oninput=render;$("typeFilter").onchange=render;
$("loginBtn").onclick=()=>$("loginDlg").showModal();
$("doLogin").onclick=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({password:$("password").value})});$("password").value="";$("loginDlg").close();await load()}catch(e){alert(e.message)}};
$("logoutBtn").onclick=async()=>{await api("/api/logout",{method:"POST"});await load()};
$("addBtn").onclick=()=>openEditor();
function openEditor(x){editing=x||null;$("dlgTitle").textContent=x?"포켓몬 수정":"포켓몬 추가";$("name").value=x?.name||"";$("cp").value=x?.cp||"";$("iv").value=x?.iv||"";$("type").value=x?.type||"";$("note").value=x?.note||"";$("image").value="";$("preview").src=x?.image||"";$("editDlg").showModal()}
window.editItem=id=>openEditor(items.find(x=>x.id===id));
window.deleteItem=async id=>{if(confirm("삭제할까요?")){await api("/api/pokemon/"+id,{method:"DELETE"});await load()}};
$("image").onchange=()=>{const f=$("image").files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("preview").src=r.result};r.readAsDataURL(f)};
$("saveBtn").onclick=async e=>{e.preventDefault();try{let image=editing?.image||"";const f=$("image").files[0];if(f)image=await compress(f);const body={name:$("name").value,cp:$("cp").value,iv:$("iv").value,type:$("type").value,note:$("note").value,image};await api(editing?"/api/pokemon/"+editing.id:"/api/pokemon",{method:editing?"PUT":"POST",body:JSON.stringify(body)});$("editDlg").close();await load()}catch(e){alert(e.message)}};
function compress(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const max=1000,s=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};im.onerror=reject;im.src=URL.createObjectURL(file)})}
load().catch(e=>alert(e.message));