(function () {
  const page = document.body.getAttribute("data-page") || "home";
  const header = document.getElementById("app-header");
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="./index.html">
          <span class="logo-mark">⚡</span>
          <span>CPO 정보방<small>전기차충전기 용어 · 현황</small></span>
        </a>
        <nav>
          <a href="./index.html" class="${page === "home" ? "active" : ""}">홈</a>
          <a href="./glossary.html" class="${page === "glossary" ? "active" : ""}">용어집</a>
          <a href="./status.html" class="${page === "status" ? "active" : ""}">충전기 현황</a>
          <a href="./sources.html" class="${page === "sources" ? "active" : ""}">출처</a>
        </nav>
      </div>`;
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const bar = document.getElementById("install-banner");
    if (bar) bar.classList.add("show");
  });
  const installBtn = document.getElementById("install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      const bar = document.getElementById("install-banner");
      if (bar) bar.classList.remove("show");
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  const params = new URLSearchParams(location.search);
  const q0 = params.get("q") || "";

  if (page === "home") renderHome(q0);
  if (page === "glossary") renderGlossary(q0, params.get("cat") || "all");
  if (page === "status") renderStatus(q0);
  if (page === "sources") renderSources();
})();

function renderHome(q0) {
  const input = document.getElementById("home-q");
  const box = document.getElementById("home-results");
  const run = () => {
    const q = input.value.trim();
    if (!q) {
      box.innerHTML = `<p class="hint">예: CPO, OCPP, 계약전력, 제주, 급속, 로밍</p>`;
      return;
    }
    const r = window.unifiedSearch(q);
    box.innerHTML = renderUnified(r, q);
  };
  input.value = q0;
  input.addEventListener("input", run);
  document.getElementById("home-search").addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function renderUnified(r, q) {
  const g = r.glossary.map((t) =>
    `<a class="term" href="./glossary.html?q=${encodeURIComponent(q)}#${t.id}"><h3>${t.term}</h3><div class="meta"><span class="tag">${window.catName(t.category)}</span><span>${t.en}</span></div><p class="muted">${t.summary}</p></a>`
  ).join("");
  const s = r.stations.map((st) =>
    `<a class="term" href="./status.html?q=${encodeURIComponent(st.name)}"><h3>${st.name}</h3><div class="meta">${window.statusBadge(st.status)}<span>${st.region} · ${st.operator} · ${st.speed} ${st.kw}kW</span></div><p class="muted">${st.address} · ${st.note}</p></a>`
  ).join("");
  const o = r.operators.map((op) =>
    `<div class="term"><h3>${op.name}</h3><div class="meta"><span class="tag">${op.type}</span></div><p class="muted">${op.note}</p></div>`
  ).join("");
  if (!g && !s && !o) return `<p class="empty">‘${q}’에 대한 항목이 없습니다. 용어 또는 지역명으로 다시 검색해 보세요.</p>`;
  return `
    ${g ? `<div class="section-head"><h2>용어</h2></div><div class="result-list">${g}</div>` : ""}
    ${s ? `<div class="section-head"><h2>충전소</h2></div><div class="result-list">${s}</div>` : ""}
    ${o ? `<div class="section-head"><h2>사업자</h2></div><div class="result-list">${o}</div>` : ""}`;
}

function renderGlossary(q0, cat0) {
  const D = window.CPO_DATA;
  const chips = document.getElementById("cat-chips");
  const list = document.getElementById("term-list");
  const input = document.getElementById("glossary-q");
  let cat = cat0 || "all";
  input.value = q0;

  const drawChips = () => {
    chips.innerHTML = [{ id: "all", name: "전체" }].concat(D.categories).map((c) =>
      `<button class="chip ${c.id === cat ? "active" : ""}" data-id="${c.id}">${c.name}</button>`
    ).join("");
    chips.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      cat = b.getAttribute("data-id");
      drawChips();
      draw();
    }));
  };

  const draw = () => {
    const rows = window.searchGlossary(input.value, cat);
    document.getElementById("term-count").textContent = rows.length + "개 용어";
    if (!rows.length) {
      list.innerHTML = `<p class="empty">조건에 맞는 용어가 없습니다.</p>`;
      return;
    }
    list.innerHTML = rows.map((t) => `
      <article class="term" id="${t.id}">
        <h3>${t.term}</h3>
        <div class="meta">
          <span class="tag">${window.catName(t.category)}</span>
          <span>${t.en}</span>
          ${(t.aliases || []).map((a) => `<span>${a}</span>`).join("")}
        </div>
        <p>${t.summary}</p>
        <p class="muted">${t.body}</p>
        <div class="why"><b>CPO가 기억할 점. </b>${t.why}</div>
      </article>`).join("");
  };

  input.addEventListener("input", draw);
  document.getElementById("glossary-search").addEventListener("submit", (e) => {
    e.preventDefault();
    draw();
  });
  drawChips();
  draw();
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView();
  }
}

function renderStatus(q0) {
  const D = window.CPO_DATA;
  const q = document.getElementById("st-q");
  const region = document.getElementById("st-region");
  const operator = document.getElementById("st-operator");
  const speed = document.getElementById("st-speed");
  const status = document.getElementById("st-status");
  q.value = q0;

  region.innerHTML = `<option value="all">지역 전체</option>` + D.regions.map((r) => `<option>${r}</option>`).join("");
  const ops = Array.from(new Set(D.stations.map((s) => s.operator))).sort();
  operator.innerHTML = `<option value="all">사업자 전체</option>` + ops.map((r) => `<option>${r}</option>`).join("");

  const opCards = document.getElementById("operator-cards");
  opCards.innerHTML = D.operators.map((o) =>
    `<article class="card"><h3>${o.name}</h3><p class="stat-value" style="font-size:13px">${o.type}</p><p>${o.note}</p></article>`
  ).join("");

  const draw = () => {
    const rows = window.searchStations({
      q: q.value,
      region: region.value,
      operator: operator.value,
      speed: speed.value,
      status: status.value
    });
    document.getElementById("st-count").textContent = rows.length + "곳";
    const tb = document.getElementById("st-body");
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="7" class="empty">조건에 맞는 충전소가 없습니다. 샘플 데이터이므로 공식 현황은 출처 페이지를 이용하세요.</td></tr>`;
      return;
    }
    tb.innerHTML = rows.map((s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.region} ${s.city}</td>
        <td>${s.operator}</td>
        <td>${s.speed} ${s.kw}kW</td>
        <td>${s.connectors}</td>
        <td>${window.statusBadge(s.status)}</td>
        <td>${s.note}</td>
      </tr>`).join("");
  };

  [q, region, operator, speed, status].forEach((el) => el.addEventListener("input", draw));
  [region, operator, speed, status].forEach((el) => el.addEventListener("change", draw));
  document.getElementById("status-search").addEventListener("submit", (e) => {
    e.preventDefault();
    draw();
  });
  draw();
}

function renderSources() {
  const D = window.CPO_DATA;
  document.getElementById("source-list").innerHTML = D.sources.map((s) =>
    `<article class="card"><h3><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></h3><p>${s.desc}</p><p class="muted">${s.url}</p></article>`
  ).join("");
}
