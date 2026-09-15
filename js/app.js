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
      box.innerHTML = `<p class="hint">예: CPO, OCPP, 헬리오시티, 송파, 스타코프</p>`;
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

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtNum(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("ko-KR");
}

function renderUnified(r, q) {
  const g = r.glossary.map((t) =>
    `<a class="term" href="./glossary.html?q=${encodeURIComponent(q)}#${t.id}"><h3>${esc(t.term)}</h3><div class="meta"><span class="tag">${esc(window.catName(t.category))}</span><span>${esc(t.en)}</span></div><p class="muted">${esc(t.summary)}</p></a>`
  ).join("");
  const s = (r.stations || []).map((st) =>
    `<a class="term" href="./status.html?q=${encodeURIComponent(st.name)}"><h3>${esc(st.name)}</h3><div class="meta">${window.chargerBadge(st)}<span>${esc(st.region)} ${esc(st.city)} · ${esc(st.type)}</span></div><p class="muted">${esc(st.road || st.jibun)} · ${esc(st.operators || "CPO 없음")}</p></a>`
  ).join("");
  if (!g && !s) return `<p class="empty">‘${esc(q)}’에 대한 항목이 없습니다. 용어 또는 단지명으로 다시 검색해 보세요.</p>`;
  return `
    ${g ? `<div class="section-head"><h2>용어</h2></div><div class="result-list">${g}</div>` : ""}
    ${s ? `<div class="section-head"><h2>단지</h2></div><div class="result-list">${s}</div>` : ""}`;
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
    list.innerHTML = rows.map((t) => {
      const extra = (t.body && t.body !== t.summary) ? `<p class="muted">${t.body}</p>` : "";
      const why = t.why ? `<div class="why"><b>CPO가 기억할 점. </b>${t.why}</div>` : "";
      const mid = t.mid ? `<span>${t.mid}</span>` : "";
      const en = t.en ? `<span>${t.en}</span>` : "";
      return `
      <article class="term" id="${t.id}">
        <h3>${t.term}</h3>
        <div class="meta">
          <span class="tag">${window.catName(t.category)}</span>
          ${en}${mid}
        </div>
        <p>${t.summary || t.body || ""}</p>
        ${extra}
        ${why}
      </article>`;
    }).join("");
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
  const type = document.getElementById("st-type");
  const charger = document.getElementById("st-charger");
  const pager = document.getElementById("st-pager");
  const more = document.getElementById("st-more");
  const PAGE = 80;
  let limit = PAGE;
  q.value = q0;

  region.innerHTML = `<option value="all">시도 전체</option>` + (D.regions || []).map((r) => `<option>${esc(r)}</option>`).join("");
  type.innerHTML = `<option value="all">분류 전체</option>` + (D.complexTypes || []).map((r) => `<option>${esc(r)}</option>`).join("");

  const hasFilter = () =>
    q.value.trim() || region.value !== "all" || type.value !== "all" || charger.value !== "all";

  const draw = () => {
    const tb = document.getElementById("st-body");
    const total = (D.stations || []).length;
    if (!hasFilter()) {
      document.getElementById("st-count").textContent = "전체 " + total.toLocaleString("ko-KR") + "개";
      tb.innerHTML = `<tr><td colspan="9" class="empty">단지명·주소·CPO로 검색하거나 시도·분류를 고르세요. 한 화면에 전체를 펼치지 않습니다.</td></tr>`;
      pager.hidden = true;
      return;
    }
    const rows = window.searchStations({
      q: q.value,
      region: region.value,
      type: type.value,
      charger: charger.value
    });
    const shown = rows.slice(0, limit);
    document.getElementById("st-count").textContent =
      rows.length.toLocaleString("ko-KR") + "곳" + (rows.length > shown.length ? " 중 " + shown.length.toLocaleString("ko-KR") + "곳 표시" : "");
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="9" class="empty">조건에 맞는 단지가 없습니다.</td></tr>`;
      pager.hidden = true;
      return;
    }
    tb.innerHTML = shown.map((s) => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>${esc(s.region)} ${esc(s.city)}</td>
        <td>${esc(s.type)}</td>
        <td>${fmtNum(s.households)}</td>
        <td>${fmtNum(s.capacity)}</td>
        <td>${fmtNum(s.evCars)}</td>
        <td>${window.chargerBadge(s)}</td>
        <td>${esc(s.operators)}</td>
        <td>${esc(s.road || s.jibun)}</td>
      </tr>`).join("");
    pager.hidden = rows.length <= shown.length;
  };

  const resetDraw = () => {
    limit = PAGE;
    draw();
  };

  [q, region, type, charger].forEach((el) => el.addEventListener("input", resetDraw));
  [region, type, charger].forEach((el) => el.addEventListener("change", resetDraw));
  document.getElementById("status-search").addEventListener("submit", (e) => {
    e.preventDefault();
    resetDraw();
  });
  more.addEventListener("click", () => {
    limit += PAGE;
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
