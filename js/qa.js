(function () {
  const CATEGORIES = ["용어집", "충전기 현황", "기타"];
  const LS_KEY = "cpo_qa_items_v1";

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
  function fmtDate(ts) {
    if (!ts) return "";
    const d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function hasFirebaseConfig() {
    const c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.projectId && String(c.apiKey).trim() !== "");
  }
  function firebaseReady() {
    return hasFirebaseConfig() && typeof window.firebase !== "undefined" && !!firebase.firestore;
  }

  function makeLocalStore() {
    let items = [];
    let listeners = [];
    try {
      items = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch (e) {
      items = [];
    }
    const byCreatedDesc = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
    const emit = () => {
      const snap = items.slice().sort(byCreatedDesc);
      listeners.forEach((cb) => cb(snap));
    };
    const persist = () => {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
      emit();
    };
    return {
      mode: "local",
      subscribe(cb) {
        listeners.push(cb);
        emit();
        return () => {
          listeners = listeners.filter((x) => x !== cb);
        };
      },
      add(item) {
        items.push(Object.assign({
          id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
          done: false,
          doneAt: null,
          createdAt: Date.now()
        }, item));
        persist();
        return Promise.resolve();
      },
      setDone(id, done) {
        const it = items.find((x) => x.id === id);
        if (it) {
          it.done = done;
          it.doneAt = done ? Date.now() : null;
        }
        persist();
        return Promise.resolve();
      }
    };
  }

  function makeFirebaseStore() {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    const db = firebase.firestore();
    const col = db.collection("qa");
    const toMillis = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v || null);
    return {
      mode: "firebase",
      subscribe(cb, onError) {
        return col.orderBy("createdAt", "desc").onSnapshot(
          (snap) => {
            const items = [];
            snap.forEach((doc) => {
              const d = doc.data();
              items.push({
                id: doc.id,
                category: d.category,
                title: d.title,
                content: d.content,
                author: d.author,
                done: !!d.done,
                createdAt: toMillis(d.createdAt) || 0,
                doneAt: toMillis(d.doneAt)
              });
            });
            cb(items);
          },
          (err) => {
            console.error("QA Firestore 구독 오류", err);
            if (onError) onError(err);
          }
        );
      },
      add(item) {
        return col.add({
          category: item.category,
          title: item.title,
          content: item.content,
          author: item.author || "",
          done: false,
          doneAt: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      },
      setDone(id, done) {
        return col.doc(id).update({
          done: done,
          doneAt: done ? firebase.firestore.FieldValue.serverTimestamp() : null
        });
      }
    };
  }

  let store;
  function initStore() {
    if (firebaseReady()) {
      try {
        return makeFirebaseStore();
      } catch (e) {
        console.error("Firebase 초기화 실패 — 기기 저장으로 전환합니다.", e);
      }
    }
    return makeLocalStore();
  }

  window.renderQA = function () {
    const form = document.getElementById("qa-form");
    const catSel = document.getElementById("qa-category");
    const titleEl = document.getElementById("qa-title");
    const contentEl = document.getElementById("qa-content");
    const authorEl = document.getElementById("qa-author");
    const listEl = document.getElementById("qa-list");
    const countEl = document.getElementById("qa-count");
    const filterEl = document.getElementById("qa-filter");
    const noteEl = document.getElementById("qa-store-note");
    const msgEl = document.getElementById("qa-form-msg");

    catSel.innerHTML = CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("");

    const setNote = (mode) => {
      if (mode === "firebase") {
        noteEl.className = "qa-note ok";
        noteEl.innerHTML = "공유 저장소에 연결되어 있습니다. 모든 사람이 같은 Q&amp;A 목록을 봅니다.";
      } else if (mode === "error") {
        noteEl.className = "qa-note warn";
        noteEl.innerHTML = "공유 저장소에 연결하지 못해 <b>이 기기에만</b> 임시 저장합니다. Firebase 콘솔에서 Firestore Database 생성과 보안 규칙을 확인해 주세요.";
      } else {
        noteEl.className = "qa-note warn";
        noteEl.innerHTML = "지금은 <b>이 기기(브라우저)에만</b> 저장됩니다. 여러 사람이 함께 보려면 <code>js/firebase-config.js</code>에 Firebase 설정이 필요합니다.";
      }
    };

    let all = [];
    let filter = "all";
    let unsub = null;
    let fellBack = false;

    const filters = [
      { id: "all", name: "전체" },
      { id: "open", name: "진행중" },
      { id: "done", name: "완료" }
    ];

    const drawFilter = () => {
      filterEl.innerHTML = filters
        .map((f) => `<button class="chip ${f.id === filter ? "active" : ""}" data-id="${f.id}">${f.name}</button>`)
        .join("");
      filterEl.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => {
          filter = b.getAttribute("data-id");
          drawFilter();
          draw();
        })
      );
    };

    const draw = () => {
      let rows = all.slice();
      if (filter === "open") rows = rows.filter((r) => !r.done);
      if (filter === "done") rows = rows.filter((r) => r.done);
      const openCount = all.filter((r) => !r.done).length;
      countEl.textContent = `전체 ${all.length}건 · 진행중 ${openCount}건`;

      if (!rows.length) {
        listEl.innerHTML = `<p class="empty">등록된 질문이 없습니다. 위 양식으로 첫 질문을 남겨 보세요.</p>`;
        return;
      }

      listEl.innerHTML = rows
        .map((r) => {
          const badge = r.done
            ? `<span class="badge ok">완료</span>`
            : `<span class="badge warn">진행중</span>`;
          const meta = [r.author ? esc(r.author) : "익명", esc(fmtDate(r.createdAt))].filter(Boolean).join(" · ");
          const doneMeta = r.done && r.doneAt ? `<span>완료 ${esc(fmtDate(r.doneAt))}</span>` : "";
          const btn = r.done
            ? `<button class="btn ghost qa-toggle" data-id="${esc(r.id)}" data-done="0">완료 취소</button>`
            : `<button class="btn qa-toggle" data-id="${esc(r.id)}" data-done="1">완료 표시</button>`;
          return `
        <article class="term qa-item ${r.done ? "is-done" : ""}">
          <div class="meta">
            ${badge}
            <span class="tag">${esc(r.category || "기타")}</span>
            <span>${meta}</span>
            ${doneMeta}
          </div>
          <h3>${esc(r.title)}</h3>
          <p>${nl2br(r.content)}</p>
          <div class="qa-actions">${btn}</div>
        </article>`;
        })
        .join("");

      listEl.querySelectorAll(".qa-toggle").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-id");
          const done = b.getAttribute("data-done") === "1";
          b.disabled = true;
          Promise.resolve(store.setDone(id, done)).catch((e) => {
            console.error(e);
            alert("처리 중 오류가 발생했습니다.");
            b.disabled = false;
          });
        })
      );
    };

    const useStore = (s) => {
      if (unsub) {
        try { unsub(); } catch (e) {}
        unsub = null;
      }
      store = s;
      setNote(s.mode);
      unsub = s.subscribe(
        (items) => {
          all = items;
          draw();
        },
        (err) => {
          if (s.mode === "firebase" && !fellBack) {
            fellBack = true;
            console.error("공유 저장소 연결 실패 — 기기 저장으로 전환합니다.", err);
            useStore(makeLocalStore());
            setNote("error");
          }
        }
      );
    };

    drawFilter();
    useStore(initStore());

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const item = {
        category: catSel.value,
        title: titleEl.value.trim(),
        content: contentEl.value.trim(),
        author: authorEl.value.trim()
      };
      if (!item.title || !item.content) {
        msgEl.textContent = "제목과 내용을 입력해 주세요.";
        return;
      }
      msgEl.textContent = "등록 중…";
      Promise.resolve(store.add(item))
        .then(() => {
          titleEl.value = "";
          contentEl.value = "";
          msgEl.textContent = "등록되었습니다.";
          setTimeout(() => {
            if (msgEl.textContent === "등록되었습니다.") msgEl.textContent = "";
          }, 2000);
        })
        .catch((err) => {
          console.error(err);
          msgEl.textContent = "등록 중 오류가 발생했습니다.";
        });
    });
  };
})();
