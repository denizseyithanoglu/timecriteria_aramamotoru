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
 status.textContent=rows.length+" etken madde gösteriliyor · "+dictionary.reduce((n,r)=>n+r.brands.length,0)+" doğrulanmış piyasa adı · "+dictionary.reduce((n,r)=>n+r.synonyms.length,0)+" eş anlamlı ad";
 box.innerHTML=rows.length?rows.map(r=>'<article class="directory-item"><h2>'+esc(r.ingredient)+'</h2>'+
  (r.synonyms.length?'<p><strong>Diğer isimler:</strong> '+r.synonyms.map(esc).join(", ")+'</p>':"")+
  '<p><strong>Piyasa isimleri:</strong> '+(r.brands.length?r.brands.map(esc).join(", "):'<span class="directory-muted">Henüz doğrulanmış marka eklenmedi</span>')+'</p>'+
  (r.brandSource?'<a href="'+esc(r.brandSource)+'" target="_blank" rel="noopener noreferrer">Piyasa adı kaynağını görüntüle ↗</a>':"")+
  '</article>').join(""):'<p class="directory-muted">Bu aramayla eşleşen ilaç yok.</p>';
}
fetch("./data/medicine_aliases.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("Dosya bulunamadı");return r.json()})
.then(data=>{dictionary=(data.dictionary||[]).sort((a,b)=>a.ingredient.localeCompare(b.ingredient,"tr"));render();})
.catch(()=>{status.textContent="Sözlük yüklenemedi";box.textContent="Lütfen GitHub Pages ayarlarını kontrol edin."});
input.addEventListener("input",render);