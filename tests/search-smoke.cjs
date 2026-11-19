// Run: node tests/search-smoke.cjs
// No NPM dependencies. Keeps medication class lookup regressions visible.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"search-helpers.js"),"utf8"),sandbox);
const api=sandbox.window.TimeSearch;
const classes=read("data/medicine_classes.json").classes;
const criteria=read("data/criteria.json").criteria;
const clinical=read("data/clinical_aliases.json").groups;
const old=read("data/medicine_aliases.json").dictionary;
const original=read("data/titck_time_brands.json").entries;
const additions=read("data/class_member_brands.json").entries;
const ingredients=new Map();
function add(name,brands=[],synonyms=[]){
 const key=api.norm(name);
 if(!ingredients.has(key))ingredients.set(key,{ingredient:name,brands:[],synonyms:[]});
 const entry=ingredients.get(key);
 for(const b of brands)if(!entry.brands.some(x=>api.norm(x)===api.norm(b)))entry.brands.push(b);
 for(const s of synonyms)if(!entry.synonyms.some(x=>api.norm(x)===api.norm(s)))entry.synonyms.push(s);
}
for(const row of original)add(row.ingredient,row.brands);
for(const row of additions)add(row.ingredient,row.brands);
for(const row of old)add(row.ingredient,[],row.synonyms);
for(const group of classes)for(const name of group.members)add(name);
const alias=api.aliasIndex([...ingredients.values()]);
const conditionIndex=api.conditionIndex(clinical);
const rows=criteria.map(row=>({...row,
 _index:api.norm([row.id,row.code,row.category,row.text,...row.notes].join(" ")),
 _conditions:api.conditionGroupsFor(row,clinical),
 _classes:api.classesForCriterion(row,classes)
}));
function search(query){
 const medicine=api.resolve(query,alias);
 const condition=api.resolveConditions(medicine.text,conditionIndex);
 const drugClass=api.resolveClassQuery(condition.text,classes);
 const ids=api.classesForIngredient(medicine.ingredient,classes);
 const hits=rows.filter(row=>drugClass.text.split(/\s+/).filter(Boolean).every(t=>{
  if(t.startsWith("~"))return row._conditions.includes(t.slice(1));
  if(t.startsWith("^"))return row._classes.includes(t.slice(1))||
    (["acei","arb"].includes(t.slice(1))&&row._classes.includes("ras"));
  if(api.termMatches(row._index,t))return true;
  return medicine.ingredient&&t===api.norm(medicine.ingredient)&&ids.some(c=>row._classes.includes(c));
 }));
 return {medicine,drugClass,ids: hits.map(r=>r.id),classes:ids};
}
const cases=[
 ["Delix","START-A5"],["Delix","STOP-A14"],["ramipril","START-H4"],
 ["ACEI","START-F1"],["ACE-I","STOP-A16"],
 ["dulox","STOP-B4"],["dulox","STOP-B5"],["DULOXX","START-B2"],
 ["Cipralex","STOP-B3"],["Lustral","STOP-B3"],["SNRİ","STOP-B4"],
 ["SSRI","STOP-B3"],["Lipitor","START-A2"],["Concor","STOP-A5"],
 ["Nexium","START-C3"],["PAF","START-A4"],["Eliquis","STOP-A40"]
];
for(const [query,expected] of cases){
 const result=search(query);
 assert.ok(result.ids.includes(expected),query+" must find "+expected+"; got "+result.ids.join(","));
}
assert.equal(search("dulox").medicine.ingredient,"duloksetin");
assert.ok(search("dulox").classes.includes("snri"));
assert.ok(!search("dulox").classes.includes("ssri"));
assert.equal(search("delix").medicine.ingredient,"ramipril");
assert.equal(search("Delix Plus").ids.length,0,"Combination brand is not a single-ingredient match");
assert.equal(search("nonexistent-test-name").ids.length,0);
console.log("PASS: "+cases.length+" positive and 5 negative/safety assertions.");
