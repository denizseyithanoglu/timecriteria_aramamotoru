"use strict";
// TIME search helper. All suggestions are client-side; spelling corrections are NEVER automatic.
window.TimeSearch = (function () {
  const norm = function(v) {
    return String(v ?? "").toLocaleLowerCase("tr-TR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/ı/g,"i").replace(/æ/g,"ae").replace(/œ/g,"oe")
      .replace(/ß/g,"ss").replace(/\s+/g," ").trim();
  };
  function aliasIndex(records) {
    const out=[], seen=new Set();
    function add(label,ingredient,kind) {
      const key=norm(label);
      if (!key || seen.has(key)) return;
      seen.add(key);out.push({key,label,ingredient,kind});
    }
    for (const r of records) {
      add(r.ingredient,r.ingredient,"ingredient");
      for(const s of r.synonyms||[]) add(s,r.ingredient,"synonym");
      for(const s of r.brands||[]) add(s,r.ingredient,"brand");
    }
    return out.sort((a,b)=>b.key.length-a.key.length);
  }
  function makeCandidates(index,criteria) {
    const words=new Map();
    function offer(label,ingredient,kind,weight) {
      const key=norm(label);
      if(key.length<4) return;
      const prev=words.get(key);
      if(!prev||prev.weight<weight)words.set(key,{key,label,ingredient,kind,weight});
    }
    for(const a of index) offer(a.label,a.ingredient,a.kind,a.kind==="brand"?150:200);
    const freq=new Map();
    for(const row of criteria){
      const terms=(row.text+" "+(row.notes||[]).join(" ")).match(/[\p{L}]{5,}/gu)||[];
      for(const term of new Set(terms.map(norm))) freq.set(term,(freq.get(term)||0)+1);
    }
    const stopwords=new Set(["uygundur","degildir","olanlar","hastalarda","olabilir","kullanimi","tedavisi","kullanilan","ozellikle","hastalar","nedeniyle","onemli","oldugu","kullanilmasi","baslanmasi","kriterleri","kullanimi","olarak","durumlarda","durumda","edilmesi","onerilir","ilaclarin","uygun"]);
    for(const [word,n] of freq){
      if(n>=3&&!stopwords.has(word)) offer(word,"","term",Math.min(n,30));
    }
    return [...words.values()];
  }
  function resolve(query,index){
    let text=norm(query).replace(/\b\d+(?:[,.]\d+)?\s*(?:mg|mcg|µg|ml|iu|gr|g)\b/g," ").replace(/\s+/g," ").trim();
    for(const a of index){
      // Avoid regex injection: aliases are compared against space-delimited tokens.
      const at=(" "+text+" ").indexOf(" "+a.key+" ");
      if(at<0) continue;
      const prefix=text.slice(0,at).trim();
      const suffix=text.slice(at+a.key.length).trim();
      text=[prefix,norm(a.ingredient),suffix].filter(Boolean).join(" ");
      return {text, matched:a.kind==="ingredient"?null:a};
    }
    return {text,matched:null};
  }
  function distance(a,b,limit){
    if(Math.abs(a.length-b.length)>limit)return limit+1;
    const d=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)d[i][0]=i;
    for(let j=0;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++){
      for(let j=1;j<=b.length;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);
        if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
      }
    }
    return d[a.length][b.length];
  }
  function suggest(query,hasResults,candidates){
    const input=norm(query);
    if(input.length<2||input.includes(" "))return [];
    const prefix=candidates.filter(x=>x.kind!=="term"&&x.key.startsWith(input)&&x.key!==input)
      .sort((a,b)=>a.key.length-b.key.length||b.weight-a.weight);
    const nearby=[];
    if(!hasResults&&input.length>=4){
      const max=input.length>=6?2:1;
      for(const v of candidates){
        if(Math.abs(v.key.length-input.length)>max||v.key===input)continue;
        const d=distance(input,v.key,max);
        if(d<=max)nearby.push({...v,d});
      }
      nearby.sort((a,b)=>a.d-b.d||b.weight-a.weight);
    }
    const choices=[],seen=new Set();
    for(const v of [...nearby,...prefix]){
      const target=v.kind==="term"?v.label:v.ingredient;
      if(seen.has(norm(target)))continue;
      seen.add(norm(target));
      choices.push({label:v.kind==="brand"?v.label:target,
        query:v.kind==="brand"?v.label:target,
        explanation:v.kind==="brand"?"Piyasa adı · "+v.ingredient:v.kind==="term"?"Kriterlerde geçen terim":"Etken madde"});
      if(choices.length>=5)break;
    }
    return choices;
  }

  // Clinical vocabulary is independent of trade-name vocabulary.
  // Only exact synonyms share search membership; a subtype query is
  // additionally labelled as a BROADER search (e.g. PAF -> AF).
  function phraseInText(text, phrase) {
    const word=norm(phrase);
    if(!word) return false;
    let pos=0;
    const value=" "+norm(text)+" ";
    while((pos=value.indexOf(word,pos))!==-1){
      const before=value[pos-1]||" ";
      const after=value[pos+word.length]||" ";
      if(!/[a-z0-9]/.test(before)&&!/[a-z0-9]/.test(after)) return true;
      pos++;
    }
    return false;
  }
  function conditionIndex(groups){
    const lookup=[];
    for(const g of groups) {
      for(const term of g.terms||[]) lookup.push({key:norm(term),label:term,id:g.id,canonical:g.label,kind:"synonym",note:""});
      for(const term of g.related||[]) lookup.push({key:norm(term.label),label:term.label,id:g.id,canonical:g.label,kind:"related",note:term.note||""});
    }
    return lookup.sort((a,b)=>b.key.length-a.key.length);
  }
  function resolveConditions(query,clinicalIndex){
    const tokens=[];
    let remaining=" "+norm(query)+" ",matched=null;
    // Longest phrases first ensures "paroksismal atriyal fibrilasyon"
    // is not partially consumed by the shorter "atriyal fibrilasyon".
    for(const entry of clinicalIndex){
      const key=" "+entry.key+" ";
      const at=remaining.indexOf(key);
      if(at===-1)continue;
      remaining=remaining.slice(0,at)+" ~"+entry.id+" "+remaining.slice(at+key.length);
      if(!matched) matched=entry;
    }
    for(const word of remaining.trim().split(/\s+/)){
      if(word&&!tokens.includes(word))tokens.push(word);
    }
    return {text:tokens.join(" "),matched};
  }
  function conditionGroupsFor(row,groups){
    const source=row.text+" "+(row.notes||[]).join(" ");
    return groups.filter(g=>(g.terms||[]).some(term=>phraseInText(source,term))).map(g=>g.id);
  }
  function termMatches(index,term){
    if(term.length>3) return index.includes(term);
    return phraseInText(index,term);
  }
  function clinicalSuggestions(query,hasResults,clinicalIndex) {
    const typed=norm(query);
    if(typed.length<3)return [];
    const choices=[];
    for(const entry of clinicalIndex){
      if(typed===entry.key)continue;
      if(hasResults&&!entry.key.startsWith(typed))continue;
      let dist=99;
      if(!hasResults){
        const max=typed.length>=11?3:typed.length>=6?2:1;
        if(Math.abs(typed.length-entry.key.length)>max)continue;
        dist=distance(typed,entry.key,max);
        if(dist>max)continue;
      }
      choices.push({label:entry.kind==="related"?entry.label:entry.canonical,query:entry.label,
        explanation:entry.kind==="related"?"Alt tanı · "+entry.canonical:"Tanı / klinik terim",dist,weight:entry.kind==="related"?1:0});
    }
    choices.sort((a,b)=>a.dist-b.dist||a.weight-b.weight||a.query.length-b.query.length);
    const out=[],seen=new Set();
    for(const v of choices){
      const key=norm(v.query);
      if(seen.has(key))continue;
      seen.add(key);out.push(v);
      if(out.length>=5)break;
    }
    return out;
  }
  return { norm, aliasIndex, makeCandidates, resolve, suggest, phraseInText,
    conditionIndex, resolveConditions, conditionGroupsFor, termMatches, clinicalSuggestions };
}());