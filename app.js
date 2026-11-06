"use strict";

/* Static, private-by-design search: all filtering happens in the user's browser. */
const state = { criteria: [], query: "", resolvedQuery: "", type: "ALL", category: "ALL", sort: "source", visible: 12, aliases: [], candidates: [], matchedAlias: null, clinicalGroups: [], clinicalIndex: [], matchedCondition: null };
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
  matchNote: document.querySelector("#match-note")
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
function rank(row, tokens) {
  if (!tokens.length) return 0;
  const code = normalize(row.id + " " + row.code);
  const body = normalize(row.text);
  const notes = normalize(row.notes.join(" "));
  return tokens.reduce(function(score, token) {
    if (code === token || code.endsWith("-" + token)) return score + 100;
    if (token.startsWith("~")) return score + 24;
    if (code.includes(token)) return score + 35;
    if (body.startsWith(token)) return score + 18;
    if (body.includes(token)) return score + 9;
    if (notes.includes(token)) return score + 3;
    return score + 1;
  }, 0);
}
function filteredRows() {
  const tokens = state.resolvedQuery.split(/\s+/).filter(Boolean);
  const rows = state.criteria.filter(function(row) {
    if (state.type !== "ALL" && row.type !== state.type) return false;
    if (state.category !== "ALL" && row.category !== state.category) return false;
    return tokens.every(function(t) {
      if (t.startsWith("~")) return row._conditions.includes(t.slice(1));
      return TimeSearch.termMatches(row._index,t);
    });
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
  const medicationSuggestions = TimeSearch.suggest(query, rows.length > 0, state.candidates);
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
    elements.matchNote.hidden = false;
    elements.matchNote.innerHTML = '<strong>' + (match.kind === "brand" ? "Piyasa adı" : "İlaç adı") +
      ' eşleşmesi:</strong> ' + escapeHTML(match.label) + ' → <strong>' +
      escapeHTML(match.ingredient) + '</strong> · Kriter metnine göre arandı.';
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
  state.query = term;
  const resolution = TimeSearch.resolve(term, state.aliases);
  const conditionResolution = TimeSearch.resolveConditions(resolution.text, state.clinicalIndex);
  state.resolvedQuery = conditionResolution.text;
  state.matchedAlias = resolution.matched;
  state.matchedCondition = conditionResolution.matched;
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
  state.category = elements.categories.value; state.visible = 12; render();
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

Promise.all(["./data/criteria.json", "./data/medicine_aliases.json", "./data/clinical_aliases.json"].map(function(url) {
  return fetch(url, {cache:"no-cache"}).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  });
})).then(function(files) {
    const data = files[0];
    state.aliases = TimeSearch.aliasIndex(files[1].dictionary || []);
    state.clinicalGroups = files[2].groups || [];
    state.clinicalIndex = TimeSearch.conditionIndex(state.clinicalGroups);
    if (!Array.isArray(data.criteria)) throw new Error("Invalid criteria file");
    state.criteria = data.criteria.map(function(row, i) {
      return Object.assign({}, row, {
        _order: i,
        _index: normalize([row.id, row.code, row.category, row.text].concat(row.notes || []).join(" ")),
        _conditions: TimeSearch.conditionGroupsFor(row, state.clinicalGroups)
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