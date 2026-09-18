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

  window.renderArchive = function () {
    const R = window.CPO_REFERENCE || { items: [] };
    const items = Array.isArray(R.items) ? R.items : [];
    const input = document.getElementById("ref-q");
    const list = document.getElementById("ref-list");
    const count = document.getElementById("ref-count");
    const note = document.getElementById("ref-note");

    if (note) {
      if (!items.length) {
        note.className = "qa-note warn";
        note.innerHTML = "기준자료(워드파일)가 아직 등록되지 않았습니다. 자료가 준비되면 검색에 표시됩니다.";
      } else {
        note.className = "qa-note";
        note.innerHTML = `기준자료 ${items.length}건${R.updated ? " · 업데이트 " + esc(R.updated) : ""}. 제목·구분·내용으로 검색합니다.`;
      }
    }

    const draw = () => {
      const q = (input.value || "").trim();
      let rows = items;
      if (q) {
        const tokens = norm(q).split(/[\s,+/]+/).filter(Boolean);
        rows = items.filter((it) => {
          const hay = norm([it.title, it.category, it.content, (it.tags || []).join(" ")].filter(Boolean).join(" "));
          return tokens.every((t) => hay.includes(t));
        });
      }
      count.textContent = rows.length + "건";

      if (!items.length) {
        list.innerHTML = `<p class="empty">등록된 기준자료가 없습니다. 워드파일 자료가 준비되면 이곳에서 검색·조회할 수 있습니다.</p>`;
        return;
      }
      if (!rows.length) {
        list.innerHTML = `<p class="empty">‘${esc(q)}’에 해당하는 기준자료가 없습니다.</p>`;
        return;
      }
      list.innerHTML = rows
        .map((it) => {
          const metaParts = [];
          if (it.category) metaParts.push(`<span class="tag">${esc(it.category)}</span>`);
          if (it.updated) metaParts.push(`<span>${esc(it.updated)}</span>`);
          const meta = metaParts.length ? `<div class="meta">${metaParts.join("")}</div>` : "";
          const link = it.url
            ? `<p class="muted"><a href="${esc(it.url)}" target="_blank" rel="noopener">원문 열기</a></p>`
            : "";
          return `
        <article class="term">
          ${meta}
          <h3>${esc(it.title)}</h3>
          <p>${nl2br(it.content || "")}</p>
          ${link}
        </article>`;
        })
        .join("");
    };

    input.addEventListener("input", draw);
    const form = document.getElementById("ref-search");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      draw();
    });
    draw();
  };
})();
