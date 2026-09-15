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

  window.searchGlossary = function (q, category, mode) {
    const test = mode === "any" ? matchAny : matchQuery;
    return D.glossary.filter((g) => {
      const catOk = !category || category === "all" || g.category === category;
      const textOk = test(q, g.term, g.en, (g.aliases || []).join(" "), g.summary, g.body, g.why);
      return catOk && textOk;
    });
  };

  window.searchStations = function (opts) {
    const { q, region, operator, speed, status, mode } = opts || {};
    const test = mode === "any" ? matchAny : matchQuery;
    return D.stations.filter((s) => {
      if (region && region !== "all" && s.region !== region) return false;
      if (operator && operator !== "all" && s.operator !== operator) return false;
      if (speed && speed !== "all" && s.speed !== speed) return false;
      if (status && status !== "all" && s.status !== status) return false;
      return test(q, s.name, s.region, s.city, s.operator, s.speed, s.connectors, s.address, s.note, String(s.kw));
    });
  };

  window.searchOperators = function (q, mode) {
    const test = mode === "any" ? matchAny : matchQuery;
    return D.operators.filter((o) => test(q, o.name, o.type, o.note));
  };

  window.unifiedSearch = function (q) {
    if (!norm(q)) return { glossary: [], stations: [], operators: [] };
    return {
      glossary: window.searchGlossary(q, "all", "any").slice(0, 8),
      stations: window.searchStations({ q, mode: "any" }).slice(0, 8),
      operators: window.searchOperators(q, "any").slice(0, 6)
    };
  };

  window.statusBadge = function (status) {
    const map = { 충전가능: "ok", 충전중: "busy", 점검중: "warn", 통신이상: "bad" };
    return '<span class="badge ' + (map[status] || "") + '">' + status + "</span>";
  };

  window.catName = function (id) {
    const c = D.categories.find((x) => x.id === id);
    return c ? c.name : id;
  };
})();
