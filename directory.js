"use strict";
const box=document.querySelector("#dictionary-results");
const input=document.querySelector("#dictionary-search");
const status=document.querySelector("#dictionary-count");
let dictionary=[];
const norm=v=>String(v??"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function render(){
 const q=norm(input.value).trim();
 const rows=dictionary.filter(r=>norm([r.ingredient,...r.synonyms,...r.brands].join(" ")).includes(q));
 status.textContent=rows.length+" etken madde gösteriliyor · "+dictionary.reduce((n,r)=>n+r.brands.length,0)+" TİTCK piyasa adı · "+dictionary.reduce((n,r)=>n+r.synonyms.length,0)+" eş anlamlı ad";
 box.innerHTML=rows.length?rows.map(r=>'<article class="directory-item"><h2>'+esc(r.ingredient)+'</h2>'+
  (r.synonyms.length?'<p><strong>Diğer isimler:</strong> '+r.synonyms.map(esc).join(", ")+'</p>':"")+
  '<p><strong>TİTCK piyasa adları:</strong> '+(r.brands.length?r.brands.map(esc).join(", "):'<span class="directory-muted">Henüz doğrulanmış marka eklenmedi</span>')+'</p>'+
  (r.brandSource?'<a href="'+esc(r.brandSource)+'" target="_blank" rel="noopener noreferrer">Piyasa adı kaynağını görüntüle ↗</a>':"")+
  '</article>').join(""):'<p class="directory-muted">Bu aramayla eşleşen ilaç yok.</p>';
}
Promise.all(["./data/medicine_aliases.json","./data/titck_time_brands.json"].map(url=>
  fetch(url,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(url+" bulunamadı");return r.json();})
)).then(files=>{
 const originals=new Map((files[0].dictionary||[]).map(x=>[norm(x.ingredient),x]));
 dictionary=(files[1].entries||[]).map(x=>({
  ingredient:x.ingredient,
  synonyms:(originals.get(norm(x.ingredient))||{}).synonyms||[],
  brands:x.brands||[],
  productCount:x.productCount||0,
  brandSource:files[1].sourceUrl
 }));
 const covered=new Set(dictionary.map(x=>norm(x.ingredient)));
 for(const entry of files[0].dictionary||[]){
  if(!covered.has(norm(entry.ingredient))){
    dictionary.push({ingredient:entry.ingredient,synonyms:entry.synonyms||[],brands:[],brandSource:null});
  }
 }
 dictionary.sort((a,b)=>a.ingredient.localeCompare(b.ingredient,"tr"));
 render();
})
.catch(()=>{status.textContent="Sözlük yüklenemedi";box.textContent="Lütfen GitHub Pages ayarlarını kontrol edin."});
input.addEventListener("input",render);