(function () {
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function nl2br(s) {
    return esc(s).replace(/\n/g, "<br />");
  }
  const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, "");

  function card(it) {
    const meta = it.category ? `<div class="meta"><span class="tag">${esc(it.category)}</span></div>` : "";
    return `
    <article class="term">
      ${meta}
      <h3>${esc(it.question)}</h3>
      <p>${nl2br(it.answer || "")}</p>
    </article>`;
  }

  window.renderFAQ = function () {
    const F = window.CPO_FAQ || { items: [] };
    const items = Array.isArray(F.items) ? F.items : [];
    const input = document.getElementById("faq-q");
    const form = document.getElementById("faq-search");
    const resultSection = document.getElementById("faq-result-section");
    const resultList = document.getElementById("faq-results");
    const resultCount = document.getElementById("faq-result-count");
    const allList = document.getElementById("faq-all");
    const allCount = document.getElementById("faq-all-count");
    const note = document.getElementById("faq-note");

    if (note) {
      if (!items.length) {
        note.className = "qa-note warn";
        note.innerHTML = "FAQ 자료(엑셀)가 아직 등록되지 않았습니다. 자료가 준비되면 검색·목록에 표시됩니다.";
      } else {
        note.className = "qa-note";
        note.innerHTML = `FAQ ${items.length}건${F.updated ? " · 업데이트 " + esc(F.updated) : ""}. 질문·답변·구분으로 검색합니다.`;
      }
    }

    const renderAll = () => {
      allCount.textContent = items.length + "건";
      allList.innerHTML = items.length
        ? items.map(card).join("")
        : `<p class="empty">등록된 FAQ가 없습니다. 엑셀 자료가 준비되면 이곳에 전체 내용이 표시됩니다.</p>`;
    };

    const search = () => {
      const q = (input.value || "").trim();
      if (!q) {
        if (resultSection) resultSection.hidden = true;
        resultList.innerHTML = "";
        resultCount.textContent = "";
        return;
      }
      const tokens = norm(q).split(/[\s,+/]+/).filter(Boolean);
      const rows = items.filter((it) => {
        const hay = norm([it.question, it.answer, it.category].filter(Boolean).join(" "));
        return tokens.every((t) => hay.includes(t));
      });
      if (resultSection) resultSection.hidden = false;
      resultCount.textContent = rows.length + "건";
      resultList.innerHTML = rows.length
        ? rows.map(card).join("")
        : `<p class="empty">‘${esc(q)}’에 해당하는 FAQ가 없습니다.</p>`;
    };

    input.addEventListener("input", search);
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      search();
    });

    renderAll();
    search();
  };
})();
