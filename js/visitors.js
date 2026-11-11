(function () {
  const COLL = "visit_stats";
  const DAY_GUARD = "cpo_visit_counted"; // 브라우저별 하루 1회만 집계
  const LOCAL_STORE = "cpo_visit_local"; // 공유 저장 불가 시 로컬 집계

  const pad = (n) => String(n).padStart(2, "0");

  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = date.getTime();
    date.setUTCMonth(0, 1);
    if (date.getUTCDay() !== 4) {
      date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursday - date.getTime()) / 604800000);
    const isoYear = new Date(firstThursday).getUTCFullYear();
    return isoYear + "-W" + pad(week);
  }

  function keysFor(d) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return {
      day: `d-${y}-${m}-${day}`,
      week: `w-${isoWeek(d)}`,
      month: `m-${y}-${m}`,
      year: `y-${y}`
    };
  }

  const fmt = (n) => (n == null ? 0 : Number(n)).toLocaleString("ko-KR");

  function hasFirebaseConfig() {
    const c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.projectId && String(c.apiKey).trim() !== "");
  }
  function firebaseReady() {
    return hasFirebaseConfig() && typeof window.firebase !== "undefined" && !!firebase.firestore;
  }

  function render(container, vals) {
    const row = [
      ["일", vals.day],
      ["주간", vals.week],
      ["월간", vals.month],
      ["연간누적", vals.year]
    ];
    container.innerHTML = row
      .map(([label, n]) => {
        const disp = typeof n === "number" ? fmt(n) : (n || "–");
        return `<div class="vstat"><span class="vlabel">${label}</span><b class="vnum">${disp}</b></div>`;
      })
      .join("");
  }

  function localCounts(keys, doIncrement) {
    let store = {};
    try {
      store = JSON.parse(localStorage.getItem(LOCAL_STORE) || "{}");
    } catch (e) {
      store = {};
    }
    if (doIncrement) {
      ["day", "week", "month", "year"].forEach((k) => {
        store[keys[k]] = (store[keys[k]] || 0) + 1;
      });
      localStorage.setItem(LOCAL_STORE, JSON.stringify(store));
    }
    return {
      day: store[keys.day] || 0,
      week: store[keys.week] || 0,
      month: store[keys.month] || 0,
      year: store[keys.year] || 0
    };
  }

  async function firebaseCounts(keys, doIncrement) {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    const col = firebase.firestore().collection(COLL);
    if (doIncrement) {
      const inc = firebase.firestore.FieldValue.increment(1);
      const ts = firebase.firestore.FieldValue.serverTimestamp();
      await Promise.all(
        ["day", "week", "month", "year"].map((k) =>
          col.doc(keys[k]).set({ count: inc, updatedAt: ts }, { merge: true })
        )
      );
    }
    const snaps = await Promise.all(
      ["day", "week", "month", "year"].map((k) => col.doc(keys[k]).get())
    );
    const val = (s) => (s.exists && s.data().count ? s.data().count : 0);
    return { day: val(snaps[0]), week: val(snaps[1]), month: val(snaps[2]), year: val(snaps[3]) };
  }

  window.renderVisitors = async function () {
    const container = document.getElementById("visitor-stats");
    if (!container) return;

    const now = new Date();
    const keys = keysFor(now);
    const doIncrement = localStorage.getItem(DAY_GUARD) !== keys.day;

    render(container, { day: "–", week: "–", month: "–", year: "–" });

    try {
      if (firebaseReady()) {
        const vals = await firebaseCounts(keys, doIncrement);
        if (doIncrement) localStorage.setItem(DAY_GUARD, keys.day);
        render(container, vals);
        return;
      }
    } catch (e) {
      console.warn("방문자 수 공유 집계 실패 — 로컬 집계로 표시합니다.", e);
    }

    const vals = localCounts(keys, doIncrement);
    if (doIncrement) localStorage.setItem(DAY_GUARD, keys.day);
    render(container, vals);
  };

  if (document.readyState !== "loading") window.renderVisitors();
  else document.addEventListener("DOMContentLoaded", () => window.renderVisitors());
})();
