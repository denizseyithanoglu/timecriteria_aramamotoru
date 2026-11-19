"use strict";

/* Static, private-by-design search: all filtering happens in the user's browser. */
const state = { criteria: [], query: "", resolvedQuery: "", type: "ALL", category: "ALL", sort: "source", visible: 12, aliases: [], candidates: [], matchedAlias: null, clinicalGroups: [], clinicalIndex: [], matchedCondition: null, matchedClass: null, classGroups: [], selectedIngredient: null, activeDrugClassIds: [], organ: "ALL", disease: "ALL", organSystems: [] };
const elements = {
  query: document.querySelector("#query"),
  clear: document.querySelector("#clear-query"),
  form: document.querySelector("#search-form"),
  categories: document.querySelector("#category"),
  sort: document.querySelector("#sort"),
  results: document.querySelector("#results"),
  count: document.querySelector("#result-count"),
  showMore: document.querySelector("#show-more"),
  remaining: document.querySelector("#remaining"),
  suggestions: document.querySelector("#suggestions"),
  matchNote: document.querySelector("#match-note"),
  organGrid: document.querySelector("#organ-grid"),
  clearOrgan: document.querySelector("#clear-organ"),
  diseaseControls: document.querySelector("#disease-controls"),
  diseaseSelect: document.querySelector("#disease-select"),
  browseSummary: document.querySelector("#browse-summary")
};

const entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function(ch) { return entityMap[ch]; });
}
function normalize(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss");
}
function labelForType(type) {
  return type === "STOP" ? "TIME-to-STOP" : "TIME-to-START";
}
function updateCategories() {
  const available = [...new Set(state.criteria
    .filter(function(r) { return state.type === "ALL" || r.type === state.type; })
    .map(function(r) { return r.category; }))].sort(function(a, b) { return a.localeCompare(b, "tr"); });
  if (state.category !== "ALL" && !available.includes(state.category)) state.category = "ALL";
  elements.categories.replaceChildren();
  const all = document.createElement("option");
  all.value = "ALL"; all.textContent = "Tüm sistemler"; elements.categories.appendChild(all);
  for (const category of available) {
    const option = document.createElement("option");
    option.value = category; option.textContent = category;
    elements.categories.appendChild(option);
  }
  elements.categories.value = state.category;
}
function literalMatch(row,query) {
  const words=TimeSearch.norm(query).split(/\s+/).filter(Boolean);
  // Literal criteria wording remains discoverable even if it coincides
  // with an ingredient, trade name, or clinical synonym.
  return words.length>0 && words.every(t=>TimeSearch.termMatches(row._index,t));
}
function rank(row, tokens) {
  if (!tokens.length) return 0;
  const code = normalize(row.id + " " + row.code);
  const body = normalize(row.text);
  const notes = normalize(row.notes.join(" "));
  return (literalMatch(row,state.query)?120:0) + tokens.reduce(function(score, token) {
    if (code === token || code.endsWith("-" + token)) return score + 100;
    if (token==="@drug") return score +
      (state.selectedIngredient && body.includes(TimeSearch.norm(state.selectedIngredient)) ? 95 : 26);
    if (token.startsWith("~") || token.startsWith("^")) return score + 24;
    if (code.includes(token)) return score + 35;
    if (body.startsWith(token)) return score + 18;
    if (body.includes(token)) return score + 9;
    if (notes.includes(token)) return score + 3;
    return score + 1;
  }, 0);
}

function updateOrganBrowser(){
  const active = state.organSystems.find(o=>o.id===state.organ);
  const totalFor = organ => state.criteria.filter(row=>
    (state.type==="ALL"||row.type===state.type)&&row._organs.includes(organ.id)).length;
  elements.organGrid.innerHTML = state.organSystems.map(organ=>{
    const count=totalFor(organ),isActive=state.organ===organ.id;
    return '<button type="button" class="organ-option'+(isActive?' active':'')+
      '" data-organ="'+escapeHTML(organ.id)+'" aria-pressed="'+String(isActive)+
      '"'+(count===0&&!isActive?' disabled':'')+'>'+
      '<span class="organ-icon" aria-hidden="true">'+escapeHTML(organ.icon||'•')+'</span>'+
      '<span class="organ-name">'+escapeHTML(organ.label)+'</span>'+
      '<span class="organ-count">'+count+'</span></button>';
  }).join("");
  elements.clearOrgan.hidden=!active;
  elements.diseaseControls.hidden=!active;
  if(!active)return;
  const relevant=state.criteria.filter(row=>
    (state.type==="ALL"||row.type===state.type)&&row._organs.includes(active.id));
  const values=(active.diseases||[]).map(id=>{
    const entry=state.clinicalGroups.find(g=>g.id===id);
    if(!entry)return null;
    return {id,label:entry.label,count:relevant.filter(row=>row._conditions.includes(id)).length};
  }).filter(x=>x&&x.count>0);
  if(state.disease!=="ALL"&&!values.some(x=>x.id===state.disease))state.disease="ALL";
  elements.diseaseSelect.replaceChildren();
  const all=document.createElement("option");
  all.value="ALL";all.textContent="Bu sistemdeki tüm kriterler ("+relevant.length+")";
  elements.diseaseSelect.appendChild(all);
  for(const value of values){
    const item=document.createElement("option");
    item.value=value.id;
    item.textContent=value.label+" ("+value.count+")";
    elements.diseaseSelect.appendChild(item);
  }
  elements.diseaseSelect.value=state.disease;
  const disease=values.find(v=>v.id===state.disease);
  elements.browseSummary.textContent=active.label+
    (disease?" · "+disease.label:"")+
    " · "+(disease?disease.count:relevant.length)+" ilgili kriter";
}

function filteredRows() {
  const tokens = state.resolvedQuery.split(/\s+/).filter(Boolean);
  const rows = state.criteria.filter(function(row) {
    if (state.type !== "ALL" && row.type !== state.type) return false;
    if (state.category !== "ALL" && row.category !== state.category) return false;
    if (state.organ !== "ALL" && !row._organs.includes(state.organ)) return false;
    if (state.disease !== "ALL" && !row._conditions.includes(state.disease)) return false;
    const semanticMatch=tokens.every(function(t) {
      // Treat multi-word active ingredients as one entity, not two unrelated tokens.
      if (t==="@drug") {
        return state.selectedIngredient &&
          (TimeSearch.phraseInText(row._index,state.selectedIngredient) ||
           state.activeDrugClassIds.some(id=>row._classes.includes(id)));
      }
      if (t.startsWith("~")) return row._conditions.includes(t.slice(1));
      if (t.startsWith("^")) {
        const group=t.slice(1);
        return row._classes.includes(group) ||
          ((group==="acei"||group==="arb") && row._classes.includes("ras"));
      }
      if (TimeSearch.termMatches(row._index,t)) return true;
      // Brand -> ingredient -> pharmacological class is an additional
      // match path, not a replacement for literal criterion matching.
      if (state.selectedIngredient && t===TimeSearch.norm(state.selectedIngredient)) {
        return state.activeDrugClassIds.some(id=>row._classes.includes(id));
      }
      return false;
    });
    return semanticMatch || literalMatch(row,state.query);
  });
  if (state.sort === "relevance" && tokens.length) {
    rows.sort(function(a, b) { return rank(b, tokens) - rank(a, tokens) || a._order - b._order; });
  } else if (state.sort === "az") {
    rows.sort(function(a, b) { return a.code[0].localeCompare(b.code[0], "tr") ||
      Number(a.code.slice(1)) - Number(b.code.slice(1)) ||
      a.type.localeCompare(b.type); });
  } else {
    rows.sort(function(a, b) { return a._order - b._order; });
  }
  return rows;
}
function cardHTML(row) {
  const typeClass = row.type === "STOP" ? "stop" : "start";
  const matchedByClass = state.selectedIngredient &&
    !TimeSearch.termMatches(row._index,TimeSearch.norm(state.selectedIngredient)) &&
    state.activeDrugClassIds.filter(id=>row._classes.includes(id));
  const classExplanation = matchedByClass && matchedByClass.length ?
    '<p class="class-match-note">İlaç sınıfı eşleşmesi: ' +
    escapeHTML(matchedByClass.map(id=>(state.classGroups.find(g=>g.id===id)||{}).label||id).join(", ")) +
    ' · Kriterin klinik şartları ayrıca değerlendirilmelidir.</p>' : "";
  const notes = row.notes.length
    ? '<aside class="note-block"><p class="note-heading">Açıklama ve istisnalar</p><ul>' +
      row.notes.map(function(n) { return "<li>" + escapeHTML(n) + "</li>"; }).join("") +
      "</ul></aside>"
    : "";
  const references = row.references.length
    ? '<details class="reference-detail"><summary>Kaynaklar (' + row.references.length +
      ')</summary><ol class="references">' +
      row.references.map(function(ref) { return "<li>" + escapeHTML(ref) + "</li>"; }).join("") +
      "</ol></details>"
    : '<span class="criterion-meta">Kaynak listesi bulunamadı</span>';
  return [
    '<article class="criterion-card" id="', escapeHTML(row.id), '" aria-label="', escapeHTML(labelForType(row.type) + " " + row.code), '">',
    '<div class="criterion-header"><div class="criterion-heading">',
    '<span class="type-tag ', typeClass, '">', labelForType(row.type), '</span>',
    '<span class="criterion-code">', escapeHTML(row.code), '</span></div>',
    '<span class="criterion-meta">', escapeHTML(row.category), ' · Kaynak PDF s. ', row.page, '</span></div>',
    '<p class="criterion-text">', escapeHTML(row.text), '</p>',
    classExplanation,
    notes,
    '<div class="card-bottom">',
    references,
    '<div class="card-actions"><button type="button" class="card-action" data-copy="', escapeHTML(row.id), '">Kriteri kopyala</button>',
    '<button type="button" class="card-action" data-link="', escapeHTML(row.id), '">Bağlantıyı kopyala</button></div>',
    '</div></article>'
  ].join("");
}

function renderHints(rows) {
  const query = state.query.trim();
  // A clinical abbreviation such as PAF must not suggest similarly
  // spelled product names such as PAFESAN.
  const pureClinicalQuery = state.matchedCondition &&
    state.resolvedQuery === "~" + state.matchedCondition.id;
  const medicationSuggestions = pureClinicalQuery ? [] :
    TimeSearch.suggest(query, rows.length > 0, state.candidates);
  const diseaseSuggestions = TimeSearch.clinicalSuggestions(query, rows.length > 0, state.clinicalIndex);
  const suggestions = [], seen = new Set();
  for (const item of [...diseaseSuggestions, ...medicationSuggestions]) {
    const key = TimeSearch.norm(item.query);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(item);
    if (suggestions.length >= 5) break;
  }
  if (state.matchedCondition && rows.length) {
    const match = state.matchedCondition;
    elements.matchNote.hidden = false;
    const special = match.kind === "related"
      ? '<br><strong>Alt tanı uyarısı:</strong> ' + escapeHTML(match.note)
      : '';
    elements.matchNote.innerHTML = '<strong>Tanı / kısaltma eşleşmesi:</strong> ' +
      escapeHTML(match.label) + ' → <strong>' + escapeHTML(match.canonical) +
      '</strong>.' + special;
    if (state.matchedAlias) {
      elements.matchNote.innerHTML += '<br><strong>İlaç adı:</strong> ' +
        escapeHTML(state.matchedAlias.label) + ' → ' +
        escapeHTML(state.matchedAlias.ingredient);
    }
  } else if (state.matchedAlias && rows.length) {
    const match = state.matchedAlias;
    const names = match.candidateBrands || [];
    const isPartial = match.kind === "partial-brand";
    const labels = state.activeDrugClassIds.filter(id=>id!=="ras")
      .map(id=>(state.classGroups.find(g=>g.id===id)||{}).label||id);
    elements.matchNote.hidden = false;
    elements.matchNote.innerHTML = '<strong>' +
      (isPartial ? "Kısmi piyasa adı" : match.kind === "brand" ? "Piyasa adı" : "İlaç adı") +
      ' eşleşmesi:</strong> ' + escapeHTML(match.label) +
      (isPartial && names.length ? ' (' + escapeHTML(names.join(" / ")) + ')' : '') +
      ' → <strong>' + escapeHTML(match.ingredient) + '</strong>' +
      (labels.length ? ' · <strong>Grup:</strong> ' + escapeHTML(labels.join(", ")) : '') +
      ' · Hem etken madde hem de ilgili ilaç sınıfının TIME kriterleri listelenir.';
  } else if (state.selectedIngredient && rows.length && state.activeDrugClassIds.length) {
    elements.matchNote.hidden = false;
    elements.matchNote.innerHTML = '<strong>İlaç grubu:</strong> ' +
      escapeHTML(state.activeDrugClassIds.filter(id=>id!=="ras").map(id=>
        (state.classGroups.find(g=>g.id===id)||{}).label||id).join(", ")) +
      ' · İlaç sınıfına ilişkin TIME kriterleri de gösterilir.';
  } else if (state.matchedClass && rows.length) {
    elements.matchNote.hidden = false;
    elements.matchNote.innerHTML = '<strong>İlaç sınıfı:</strong> ' +
      escapeHTML(state.matchedClass.label) + ' · İlgili TIME kriterleri listeleniyor.';
  } else if (!rows.length && query.length >= 4 && suggestions.length) {
    elements.matchNote.hidden = false;
    elements.matchNote.innerHTML = '<strong>Şunu mu demek istediniz?</strong> ' +
      suggestions.slice(0, 3).map(function(x) {
        return '<button type="button" class="did-you-mean" data-suggestion="' +
          escapeHTML(x.query) + '">' + escapeHTML(x.label) + '</button>';
      }).join(" ");
  } else {
    elements.matchNote.hidden = true;
    elements.matchNote.replaceChildren();
  }
  if (suggestions.length && query) {
    elements.suggestions.hidden = false;
    elements.suggestions.innerHTML =
      '<div class="suggestions-caption">' + (rows.length ? "ARAMA ÖNERİLERİ" : "BUNLARI MI ARADINIZ?") + '</div>' +
      suggestions.map(function(x) {
        return '<button type="button" role="option" class="suggestion-option" data-suggestion="' +
          escapeHTML(x.query) + '"><strong>' + escapeHTML(x.label) +
          '</strong><small>' + escapeHTML(x.explanation) + '</small></button>';
      }).join("");
  } else {
    elements.suggestions.hidden = true;
    elements.suggestions.replaceChildren();
  }
}
function chooseSuggestion(event) {
  const choice = event.target.closest("[data-suggestion]");
  if (!choice) return;
  searchBy(choice.dataset.suggestion);
  elements.suggestions.hidden = true;
  elements.query.focus();
}
function render() {
  updateOrganBrowser();
  const all = filteredRows();
  const subset = all.slice(0, state.visible);
  renderHints(all);
  document.querySelectorAll("[data-type]").forEach(function(button) {
    const active = button.dataset.type === state.type;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.clear.hidden = state.query.trim().length === 0;
  elements.count.textContent = all.length.toLocaleString("tr-TR") + " kriter bulundu";
  elements.results.setAttribute("aria-busy", "false");
  if (!all.length) {
    elements.results.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div>' +
      '<h3>Bu aramayla eşleşen kriter bulunamadı</h3><p>Başka bir ilaç, hastalık, anahtar kelime veya kriter kodu deneyin.</p></div>';
  } else {
    elements.results.innerHTML = subset.map(cardHTML).join("");
  }
  const remaining = all.length - subset.length;
  elements.showMore.hidden = remaining <= 0;
  elements.remaining.textContent = remaining > 0 ? "(" + remaining.toLocaleString("tr-TR") + " kaldı)" : "";
}
function searchBy(term) {
  // A new text search always spans the entire TIME library, regardless
  // of which organ, disease, chapter, or START/STOP filter was selected.
  if(term.trim()){
    state.organ="ALL";state.disease="ALL";state.category="ALL";state.type="ALL";
    updateCategories();
  }
  state.query = term;
  // For exact known clinical terms, clinical meaning wins over any
  // coincidentally named pharmaceutical product or ingredient.
  const key=TimeSearch.norm(term);
  const isExactClinical=state.clinicalIndex.some(entry=>entry.key===key);
  const isExactClass=state.classGroups.some(group=>(group.search||[]).some(x=>TimeSearch.norm(x)===key));
  const resolution=(isExactClinical||isExactClass)
    ? {text:key,matched:null,ingredient:null}
    : TimeSearch.resolve(term, state.aliases);
  const conditionResolution = TimeSearch.resolveConditions(resolution.text, state.clinicalIndex);
  const classResolution = TimeSearch.resolveClassQuery(conditionResolution.text,state.classGroups);
  // Replace the resolved active ingredient with an atomic search token.
  // This fixes brands such as INFERJECT -> "demir karboksimaltoz" where
  // splitting on spaces previously required both words in the PDF text.
  state.resolvedQuery = resolution.ingredient ?
    classResolution.text.replace(TimeSearch.norm(resolution.ingredient),"@drug") :
    classResolution.text;
  state.matchedAlias = resolution.matched;
  state.matchedCondition = conditionResolution.matched;
  state.matchedClass = classResolution.matched;
  state.selectedIngredient = resolution.ingredient;
  state.activeDrugClassIds = TimeSearch.classesForIngredient(resolution.ingredient,state.classGroups);
  state.visible = 12;
  elements.query.value = term;
  if (term.trim()) {
    state.sort = "relevance";
  } else {
    state.sort = "source";
  }
  elements.sort.value = state.sort;
  render();
}
async function copyText(text, button) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const box = document.createElement("textarea");
      box.value = text; box.style.position = "fixed"; box.style.opacity = "0";
      document.body.appendChild(box); box.select();
      const ok = document.execCommand("copy");
      box.remove();
      if (!ok) throw new Error("Clipboard permission denied");
    }
    const original = button.textContent;
    button.textContent = "Kopyalandı ✓";
    window.setTimeout(function() { button.textContent = original; }, 1800);
  } catch (error) {
    const original = button.textContent;
    button.textContent = "Kopyalanamadı";
    window.setTimeout(function() { button.textContent = original; }, 1800);
  }
}
function openHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const row = state.criteria.find(function(r) { return r.id === id; });
  if (!row) return;
  state.type = "ALL"; state.category = "ALL";
  updateCategories();
  searchBy(id);
  window.requestAnimationFrame(function() {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}
document.querySelectorAll("[data-type]").forEach(function(button) {
  button.addEventListener("click", function() {
    state.type = button.dataset.type;
    state.visible = 12;
    updateCategories(); render();
  });
});
document.querySelectorAll("[data-example]").forEach(function(button) {
  button.addEventListener("click", function() {
    searchBy(button.dataset.example); elements.query.focus();
  });
});
elements.form.addEventListener("submit", function(event) {
  event.preventDefault(); document.querySelector(".library").scrollIntoView({ block: "start", behavior: "smooth" });
});
elements.query.addEventListener("input", function() { searchBy(elements.query.value); });
elements.clear.addEventListener("click", function() { searchBy(""); elements.query.focus(); });
elements.categories.addEventListener("change", function() {
  state.category = elements.categories.value;
  state.organ = "ALL"; state.disease = "ALL";
  state.visible = 12; render();
});
elements.organGrid.addEventListener("click", function(event) {
  const selected=event.target.closest("[data-organ]");
  if(!selected || selected.disabled) return;
  state.organ=state.organ===selected.dataset.organ?"ALL":selected.dataset.organ;
  state.disease="ALL"; state.category="ALL";
  updateCategories();searchBy("");
});
elements.clearOrgan.addEventListener("click", function() {
  state.organ="ALL";state.disease="ALL";render();
});
elements.diseaseSelect.addEventListener("change", function() {
  state.disease=elements.diseaseSelect.value;state.visible=12;render();
});
elements.sort.addEventListener("change", function() {
  state.sort = elements.sort.value; state.visible = 12; render();
});
elements.suggestions.addEventListener("click", chooseSuggestion);
elements.matchNote.addEventListener("click", chooseSuggestion);
elements.showMore.addEventListener("click", function() {
  state.visible += 12; render();
});
elements.results.addEventListener("click", function(event) {
  const button = event.target.closest("button[data-copy],button[data-link]");
  if (!button) return;
  const id = button.dataset.copy || button.dataset.link;
  const row = state.criteria.find(function(r) { return r.id === id; });
  if (!row) return;
  if (button.dataset.link) {
    copyText(window.location.href.split("#")[0] + "#" + row.id, button);
  } else {
    const message = labelForType(row.type) + " " + row.code + " | " + row.category + "\n" + row.text +
      (row.notes.length ? "\n\nAçıklamalar:\n" + row.notes.map(function(n) { return "• " + n; }).join("\n") : "") +
      "\n\nTIME Kriterleri 2024, " + labelForType(row.type) + ", PDF s. " + row.page + ".";
    copyText(message, button);
  }
});
document.addEventListener("keydown", function(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault(); elements.query.focus(); elements.query.select();
  }
  if (event.key === "Escape" && document.activeElement === elements.query) searchBy("");
});
window.addEventListener("hashchange", openHash);

Promise.all(["./data/criteria.json", "./data/medicine_aliases.json", "./data/clinical_aliases.json", "./data/titck_time_brands.json", "./data/medicine_classes.json", "./data/class_member_brands.json", "./data/organ_systems.json"].map(function(url) {
  return fetch(url, {cache:"no-cache"}).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  });
})).then(function(files) {
    const data = files[0];
    // TİTCK is authoritative for the public-facing brand list. Existing
    // manual aliases are retained only for international/generic synonyms.
    const seed = new Map((files[1].dictionary || []).map(function(entry) {
      return [TimeSearch.norm(entry.ingredient), entry];
    }));
    const scopedDrugs = (files[3].entries || []).map(function(entry) {
      const earlier = seed.get(TimeSearch.norm(entry.ingredient));
      return {
        ingredient: entry.ingredient,
        synonyms: earlier ? earlier.synonyms || [] : [],
        brands: entry.brands || [],
        brandSource: files[3].sourceUrl,
        productCount: entry.productCount || 0
      };
    });
    const extraIngredients = files[5].entries || [];
    const byIngredient = new Map(scopedDrugs.map(item=>[TimeSearch.norm(item.ingredient),item]));
    for (const extra of extraIngredients) {
      const key=TimeSearch.norm(extra.ingredient);
      if (byIngredient.has(key)) {
        const row=byIngredient.get(key);
        const used = new Set(row.brands.map(TimeSearch.norm));
        for (const brand of extra.brands || []) {
          if (!used.has(TimeSearch.norm(brand))) {
            row.brands.push(brand); used.add(TimeSearch.norm(brand));
          }
        }
        const synonymKeys = new Set((row.synonyms||[]).map(TimeSearch.norm));
        for (const synonym of extra.synonyms || []) {
          if (!synonymKeys.has(TimeSearch.norm(synonym))) {
            row.synonyms.push(synonym); synonymKeys.add(TimeSearch.norm(synonym));
          }
        }
      } else {
        const prev=seed.get(key);
        const row={ingredient:extra.ingredient,brands:extra.brands||[],
          synonyms:[...(prev?prev.synonyms||[]:[]),...(extra.synonyms||[])],brandSource:files[5].sourceURL};
        scopedDrugs.push(row); byIngredient.set(key,row);
      }
    }
    // All further named members belong to a drug class explicitly present
    // in the TIME criteria, even when no Turkish product is listed.
    state.classGroups = files[4].classes || [];
    for (const group of state.classGroups) for (const ingredient of group.members || []) {
      const key=TimeSearch.norm(ingredient);
      if (!byIngredient.has(key)) {
        const row={ingredient,brands:[],synonyms:[],brandSource:null};
        scopedDrugs.push(row);byIngredient.set(key,row);
      }
    }
    // Preserve explicitly named TIME ingredients with no unsuspended
    // single-ingredient TİTCK product (but do not invent any brand).
    const covered = new Set(scopedDrugs.map(function(x) { return TimeSearch.norm(x.ingredient); }));
    for (const entry of files[1].dictionary || []) {
      if (!covered.has(TimeSearch.norm(entry.ingredient))) {
        scopedDrugs.push({ ingredient: entry.ingredient, synonyms: entry.synonyms || [], brands: [] });
      }
    }
    state.aliases = TimeSearch.aliasIndex(scopedDrugs);
    state.clinicalGroups = files[2].groups || [];
    state.organSystems = files[6].systems || [];
    state.clinicalIndex = TimeSearch.conditionIndex(state.clinicalGroups);
    if (!Array.isArray(data.criteria)) throw new Error("Invalid criteria file");
    state.criteria = data.criteria.map(function(row, i) {
      return Object.assign({}, row, {
        _order: i,
        _index: normalize([row.id, row.code, row.category, row.text].concat(row.notes || []).join(" ")),
        _conditions: TimeSearch.conditionGroupsFor(row, state.clinicalGroups),
        _classes: TimeSearch.classesForCriterion(row, state.classGroups),
        _organs: state.organSystems.filter(organ=>
          (organ.categories||[]).includes(row.category) ||
          (organ.criterionIds||[]).includes(row.id)).map(organ=>organ.id)
      });
    });
    document.querySelector("#count-all").textContent = state.criteria.length;
    document.querySelector("#count-stop").textContent = state.criteria.filter(function(r) { return r.type === "STOP"; }).length;
    document.querySelector("#count-start").textContent = state.criteria.filter(function(r) { return r.type === "START"; }).length;
    state.candidates = TimeSearch.makeCandidates(state.aliases, state.criteria);
    updateCategories(); render(); openHash();
  })
  .catch(function(error) {
    console.error("Unable to load criteria", error);
    elements.results.setAttribute("aria-busy", "false");
    elements.count.textContent = "Veri yüklenemedi";
    elements.results.innerHTML = '<div class="empty-state"><h3>Kriter dosyası açılamadı</h3>' +
      '<p>GitHub Pages yayınının etkin olduğunu ve data/criteria.json dosyasının bulunduğunu kontrol edin.</p></div>';
  });