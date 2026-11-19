"use strict";
// Browse the same source-of-truth catalog that powers the search engine.
const box=document.querySelector("#dictionary-results");
const input=document.querySelector("#dictionary-search");
const status=document.querySelector("#dictionary-count");
let dictionary=[];
const norm=v=>String(v??"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function render(){
 const q=norm(input.value).trim();
 const rows=dictionary.filter(r=>norm([r.ingredient,...r.synonyms,...r.brands,...r.groupLabels].join(" ")).includes(q));
 const brandTotal=dictionary.reduce((n,r)=>n+r.brands.length,0);
 status.textContent=rows.length+" etken madde gösteriliyor · "+brandTotal+
  " seçilmiş TİTCK piyasa adı · "+dictionary.reduce((n,r)=>n+r.synonyms.length,0)+" eş anlamlı ad";
 box.innerHTML=rows.length?rows.map(r=>
  '<article class="directory-item"><h2>'+esc(r.ingredient)+'</h2>'+
  (r.groupLabels.length?'<p><strong>TIME ilaç sınıfları:</strong> '+r.groupLabels.map(esc).join(", ")+'</p>':"")+
  (r.synonyms.length?'<p><strong>Diğer isimler:</strong> '+r.synonyms.map(esc).join(", ")+'</p>':"")+
  '<p><strong>TİTCK piyasa adları:</strong> '+(r.brands.length?r.brands.map(esc).join(", "):
  '<span class="directory-muted">Bu kaynak kapsamında doğrulanmış piyasa adı eklenmedi</span>')+'</p>'+
  (r.brands.length?'<a href="https://www.titck.gov.tr/dinamikmodul/85" target="_blank" rel="noopener noreferrer">Kaynak: TİTCK ruhsatlı ürün listesi ↗</a>':"")+
  '</article>').join(""):'<p class="directory-muted">Bu aramayla eşleşen etken madde yok.</p>';
}
Promise.all(["./data/medicine_aliases.json","./data/titck_time_brands.json",
 "./data/medicine_classes.json","./data/class_member_brands.json"].map(url=>
  fetch(url,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(url+" bulunamadı");return r.json();})
)).then(files=>{
 const [seed,official,classes,extra]=files;
 const merged=new Map();
 function insert(ingredient,brands=[],synonyms=[]){
  const key=norm(ingredient);
  if(!merged.has(key))merged.set(key,{ingredient,brands:[],synonyms:[],groupLabels:[]});
  const target=merged.get(key);
  for(const b of brands||[])if(!target.brands.some(x=>norm(x)===norm(b)))target.brands.push(b);
  for(const s of synonyms||[])if(!target.synonyms.some(x=>norm(x)===norm(s)))target.synonyms.push(s);
  return target;
 }
 for(const r of official.entries||[])insert(r.ingredient,r.brands);
 for(const r of extra.entries||[])insert(r.ingredient,r.brands,r.synonyms||[]);
 for(const r of seed.dictionary||[])insert(r.ingredient,[],r.synonyms);
 for(const g of classes.classes||[])for(const name of g.members||[]){
  const r=insert(name);
  if(!r.groupLabels.includes(g.label))r.groupLabels.push(g.label);
 }
 dictionary=[...merged.values()].sort((a,b)=>a.ingredient.localeCompare(b.ingredient,"tr"));
 render();
}).catch(error=>{console.error(error);status.textContent="Sözlük yüklenemedi";box.textContent="Lütfen sayfayı yenileyin veya GitHub Pages durumunu kontrol edin."});
input.addEventListener("input",render);