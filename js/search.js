(function () {
  const D = window.CPO_DATA;
  const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, "");
  const hay = (...parts) => norm(parts.filter(Boolean).join(" "));

  function matchQuery(q, ...parts) {
    const nq = norm(q);
    if (!nq) return true;
    return nq.split(/[\s,+/]+/).filter(Boolean).every((token) => hay(...parts).includes(token));
  }

  function matchAny(q, ...parts) {
    const nq = norm(q);
    if (!nq) return true;
    return nq.split(/[\s,+/]+/).filter(Boolean).some((token) => hay(...parts).includes(token));
  }

  function tokensOf(q) {
    return norm(q).split(/[\s,+/]+/).filter(Boolean);
  }

  function fieldScore(field, tok) {
    if (!field || !tok) return 0;
    if (field === tok) return 1000;
    if (field.startsWith(tok)) return 450;
    const idx = field.indexOf(tok);
    if (idx < 0) return 0;
    const boundary = idx === 0 || /[^0-9a-z가-힣]/.test(field[idx - 1] || "");
    return boundary ? 280 : 160;
  }

  function glossaryScore(g, q) {
    const tokens = tokensOf(q);
    if (!tokens.length) return 0;
    const term = norm(g.term);
    const en = norm(g.en);
    const mid = norm(g.mid);
    const aliases = norm((g.aliases || []).join(" "));
    const body = norm([g.summary, g.body, g.why].filter(Boolean).join(" "));
    let score = 0;
    let allInTerm = true;
    tokens.forEach((tok) => {
      const ts = fieldScore(term, tok);
      const es = fieldScore(en, tok);
      const ms = Math.max(fieldScore(mid, tok), fieldScore(aliases, tok)) * 0.15;
      const bs = body.includes(tok) ? 12 : 0;
      if (ts === 0) allInTerm = false;
      score += Math.max(ts, es) + ms + bs;
    });
    if (allInTerm) score += 220;
    if (term === tokens.join("")) score += 400;
    score += Math.max(0, 60 - term.length);
    return score;
  }

  window.searchGlossary = function (q, category, mode) {
    const test = mode === "any" ? matchAny : matchQuery;
    const ranked = !norm(q);
    const rows = D.glossary.filter((g) => {
      const catOk = !category || category === "all" || g.category === category;
      const textOk = ranked ? true : test(q, g.term, g.en, g.mid, (g.aliases || []).join(" "), g.summary, g.body, g.why);
      return catOk && textOk;
    });
    if (ranked) return rows;
    return rows
      .map((g) => ({ g, s: glossaryScore(g, q) }))
      .sort((a, b) => b.s - a.s || a.g.term.localeCompare(b.g.term, "ko"))
      .map((x) => x.g);
  };

  function chargerInstalled(s) {
    return s.ground === "설치" || s.under === "설치";
  }

  function stationScore(s, q) {
    const tokens = tokensOf(q);
    if (!tokens.length) return 0;
    const name = norm(s.name);
    const region = norm(s.region);
    const city = norm(s.city);
    const addr = norm([s.road, s.jibun].filter(Boolean).join(" "));
    const ops = norm(s.operators);
    const code = norm(s.code);
    let score = 0;
    let allInName = true;
    tokens.forEach((tok) => {
      const ns = fieldScore(name, tok);
      const rs = Math.max(fieldScore(region, tok), fieldScore(city, tok));
      const os = fieldScore(ops, tok);
      const as = addr.includes(tok) ? 80 : 0;
      const cs = fieldScore(code, tok) * 0.2;
      if (ns === 0) allInName = false;
      score += Math.max(ns, rs * 0.55, os * 0.45) + as + cs;
    });
    if (allInName) score += 220;
    if (name === tokens.join("")) score += 400;
    score += Math.max(0, 40 - name.length);
    return score;
  }

  window.searchStations = function (opts) {
    const { q, region, type, charger, mode } = opts || {};
    const list = D.stations || [];
    const test = mode === "any" ? matchAny : matchQuery;
    const ranked = !norm(q);
    const rows = list.filter((s) => {
      if (region && region !== "all" && s.region !== region) return false;
      if (type && type !== "all" && s.type !== type) return false;
      if (charger === "yes" && !chargerInstalled(s)) return false;
      if (charger === "no" && chargerInstalled(s)) return false;
      return ranked ? true : test(q, s.name, s.region, s.city, s.road, s.jibun, s.operators, s.code, s.type);
    });
    if (ranked) return rows;
    return rows
      .map((s) => ({ s, sc: stationScore(s, q) }))
      .sort((a, b) => b.sc - a.sc || a.s.name.localeCompare(b.s.name, "ko"))
      .map((x) => x.s);
  };

  window.unifiedSearch = function (q) {
    if (!norm(q)) return { glossary: [], stations: [] };
    return {
      glossary: window.searchGlossary(q, "all", "any").slice(0, 8),
      stations: window.searchStations({ q, mode: "any" }).slice(0, 8)
    };
  };

  window.chargerBadge = function (s) {
    const on = chargerInstalled(s);
    const n = s.chargers;
    const label = on
      ? (n != null ? "설치 " + Number(n).toLocaleString("ko-KR") + "기" : "설치")
      : "미설치";
    return '<span class="badge ' + (on ? "ok" : "") + '">' + label + "</span>";
  };

  window.catName = function (id) {
    const c = D.categories.find((x) => x.id === id);
    return c ? c.name : id;
  };
})();
