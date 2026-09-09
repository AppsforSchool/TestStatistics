(() => {
  "use strict";

  /* ========================================================
     定数
     ======================================================== */
  const TESTS = [
    "第1回実力テスト",
    "前期中間テスト",
    "第2回実力テスト",
    "前期期末テスト",
    "第3回実力テスト",
    "後期中間テスト",
    "第4回実力テスト",
    "後期期末テスト",
  ];
  const BASE_SUBJECTS = ["国語", "社会", "数学", "理科", "英語"];
  const EXTRA_SUBJECT = "保健体育";
  const SUBJECT_CLASS = {
    "国語": "s-kokugo",
    "社会": "s-shakai",
    "数学": "s-sugaku",
    "理科": "s-rika",
    "英語": "s-eigo",
    "保健体育": "s-hoken",
  };
  const STORAGE_KEY = "teikiTestScores_v1";

  const isFinalTest = (name) => name.includes("期末");
  const subjectsForTest = (name) =>
    isFinalTest(name) ? [...BASE_SUBJECTS, EXTRA_SUBJECT] : BASE_SUBJECTS;

  /* ========================================================
     データ層（localStorage）
     ======================================================== */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("データの読み込みに失敗しました", e);
      return {};
    }
  }

  let data = loadData();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    flashSaveIndicator();
  }

  function getEntry(test, subject) {
    const t = data[test];
    const e = t && t[subject];
    return {
      score: e && e.score !== undefined && e.score !== null && e.score !== "" ? Number(e.score) : null,
      average: e && e.average !== undefined && e.average !== null && e.average !== "" ? Number(e.average) : null,
    };
  }

  function setEntry(test, subject, field, rawValue) {
    if (!data[test]) data[test] = {};
    if (!data[test][subject]) data[test][subject] = { score: null, average: null };
    data[test][subject][field] = rawValue === "" ? null : Number(rawValue);
    persist();
  }

  /* ========================================================
     状態
     ======================================================== */
  let currentTest = TESTS[1]; // 前期中間テストを初期表示

  /* ========================================================
     ユーティリティ
     ======================================================== */
  const fmt0 = (n) => Math.round(n).toString();
  const fmt1 = (n) => n.toFixed(1);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  let saveIndicatorTimer = null;
  function flashSaveIndicator() {
    const indicator = document.getElementById("save-indicator");
    if (!indicator) return;
    indicator.textContent = "保存しました";
    indicator.classList.add("show");
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => indicator.classList.remove("show"), 1200);
  }

  /* ========================================================
     タブ描画
     ======================================================== */
  function renderTabs() {
    const wrap = document.getElementById("test-tabs");
    wrap.innerHTML = "";
    TESTS.forEach((testName) => {
      const btn = el("button", "test-tab", testName);
      btn.type = "button";
      if (testName === currentTest) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentTest = testName;
        renderAll();
      });
      wrap.appendChild(btn);
    });
  }

  /* ========================================================
     入力テーブル描画
     ======================================================== */
  function renderInput() {
    document.getElementById("input-card-title").textContent = currentTest;
    const body = document.getElementById("input-table-body");
    body.innerHTML = "";

    subjectsForTest(currentTest).forEach((subject) => {
      const entry = getEntry(currentTest, subject);
      const row = el("tr");

      const th = el("td");
      const label = el("span", `subject-label ${SUBJECT_CLASS[subject]}`, subject);
      th.appendChild(label);
      row.appendChild(th);

      const scoreTd = el("td", "col-num");
      const scoreInput = document.createElement("input");
      scoreInput.type = "number";
      scoreInput.step = "any";
      scoreInput.min = "0";
      scoreInput.placeholder = "-";
      scoreInput.value = entry.score === null ? "" : entry.score;
      scoreInput.addEventListener("input", (e) => {
        setEntry(currentTest, subject, "score", e.target.value);
        renderDetail();
        renderOverall();
      });
      scoreTd.appendChild(scoreInput);
      row.appendChild(scoreTd);

      const avgTd = el("td", "col-num");
      const avgInput = document.createElement("input");
      avgInput.type = "number";
      avgInput.step = "any";
      avgInput.min = "0";
      avgInput.placeholder = "-";
      avgInput.value = entry.average === null ? "" : entry.average;
      avgInput.addEventListener("input", (e) => {
        setEntry(currentTest, subject, "average", e.target.value);
        renderDetail();
        renderOverall();
      });
      avgTd.appendChild(avgInput);
      row.appendChild(avgTd);

      body.appendChild(row);
    });
  }

  /* ========================================================
     このテストの得点表（詳細）
     ======================================================== */
  function renderDetail() {
    document.getElementById("detail-title").textContent = `得点表　${currentTest}`;
    const body = document.getElementById("detail-table-body");
    body.innerHTML = "";

    const subjects = subjectsForTest(currentTest);
    let totalScore = 0, totalAvg = 0;

    subjects.forEach((subject) => {
      const { score, average } = getEntry(currentTest, subject);
      const s = score ?? 0;
      const a = average ?? 0;
      totalScore += s;
      totalAvg += a;

      const row = el("tr");
      const nameTd = el("td");
      nameTd.appendChild(el("span", `subject-label ${SUBJECT_CLASS[subject]}`, subject));
      row.appendChild(nameTd);

      row.appendChild(makeCell(score === null ? "-" : fmt0(score), true, score === null));
      row.appendChild(makeCell(score === null ? "-" : fmt0(score - 100), true, score === null));
      row.appendChild(makeCell(average === null ? "-" : fmt1(average), true, average === null));

      if (score === null) {
        row.appendChild(makeCell("-", true, true));
      } else {
        const diff = score - a;
        const td = makeCell((diff > 0 ? "+" : "") + fmt1(diff), true, false);
        td.classList.add(diff > 0 ? "diff-pos" : diff < 0 ? "diff-neg" : "");
        row.appendChild(td);
      }

      if (score !== null && average) {
        row.appendChild(makeCell(fmt1((score / average) * 100) + "%", true, false));
      } else {
        row.appendChild(makeCell("-", true, true));
      }

      body.appendChild(row);
    });

    const n = subjects.length;
    const totalRow = el("tr", "row-total");
    totalRow.appendChild(el("td", null, "合計"));
    totalRow.appendChild(makeCell(fmt0(totalScore), true, false));
    totalRow.appendChild(makeCell(fmt0(totalScore - 100 * n), true, false));
    totalRow.appendChild(makeCell(fmt1(totalAvg), true, false));
    totalRow.appendChild(makeCell(fmt1(totalScore - totalAvg), true, false));
    totalRow.appendChild(makeCell("-", true, true));
    body.appendChild(totalRow);

    const avgRow = el("tr", "row-avg");
    avgRow.appendChild(el("td", null, "平均"));
    avgRow.appendChild(makeCell(fmt1(totalScore / n), true, false));
    avgRow.appendChild(makeCell(fmt1(totalScore / n - 100), true, false));
    avgRow.appendChild(makeCell(fmt1(totalAvg / n), true, false));
    avgRow.appendChild(makeCell(fmt1((totalScore - totalAvg) / n), true, false));
    avgRow.appendChild(makeCell("-", true, true));
    body.appendChild(avgRow);
  }

  function makeCell(text, numeric, dash) {
    const td = el("td", numeric ? "col-num num" : null, text);
    if (dash) td.classList.add("cell-dash");
    return td;
  }

  /* ========================================================
     総合結果テーブル
     ======================================================== */
  function renderOverall() {
    const headRow = document.getElementById("overall-head-row");
    headRow.innerHTML = "";
    headRow.appendChild(el("th", "col-subject", "教科"));
    TESTS.forEach((t) => headRow.appendChild(el("th", "col-num", t.replace("テスト", ""))));
    headRow.appendChild(el("th", "col-num stat-head", "最高"));
    headRow.appendChild(el("th", "col-num stat-head", "最低"));
    headRow.appendChild(el("th", "col-num stat-head", "平均"));

    const body = document.getElementById("overall-table-body");
    body.innerHTML = "";

    // 各教科の値を先に集計しておく（合計行で使う）
    const subjectRows = {};
    BASE_SUBJECTS.forEach((subject) => {
      subjectRows[subject] = TESTS.map((t) => getEntry(t, subject).score);
    });
    const hokenRow = TESTS.map((t) =>
      isFinalTest(t) ? getEntry(t, EXTRA_SUBJECT).score : null
    );

    BASE_SUBJECTS.forEach((subject) => {
      body.appendChild(buildOverallRow(subject, SUBJECT_CLASS[subject], subjectRows[subject], TESTS.map(() => true)));
    });

    // 合計・平均（5教科）
    const totalPerTest = TESTS.map((t, i) => {
      const vals = BASE_SUBJECTS.map((s) => subjectRows[s][i]).filter((v) => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    });
    const avgPerTest = TESTS.map((t, i) => {
      const vals = BASE_SUBJECTS.map((s) => subjectRows[s][i]).filter((v) => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });

    body.appendChild(buildOverallRow("合計", null, totalPerTest, TESTS.map(() => true), "row-total", true));
    body.appendChild(buildOverallRow("平均", null, avgPerTest, TESTS.map(() => true), "row-avg", true, true));

    // 保健体育・全合計（期末テストのみ）
    const finalMask = TESTS.map((t) => isFinalTest(t));
    body.appendChild(buildOverallRow(EXTRA_SUBJECT, SUBJECT_CLASS[EXTRA_SUBJECT], hokenRow, finalMask));

    const zenGoukei = TESTS.map((t, i) => {
      if (!isFinalTest(t)) return null;
      const base = totalPerTest[i];
      const hoken = hokenRow[i];
      if (base === null && hoken === null) return null;
      return (base ?? 0) + (hoken ?? 0);
    });
    body.appendChild(buildOverallRow("全合計", null, zenGoukei, finalMask, "row-total", true));
  }

  function buildOverallRow(label, cssClass, values, mask, rowClass, isInt, isAvgRow) {
    const row = el("tr", rowClass || null);
    const nameTd = el("td");
    if (cssClass) {
      nameTd.appendChild(el("span", `subject-label ${cssClass}`, label));
    } else {
      nameTd.textContent = label;
    }
    row.appendChild(nameTd);

    values.forEach((v, i) => {
      if (!mask[i]) {
        row.appendChild(makeCell("－", true, false));
        row.lastChild.classList.add("cell-inactive");
        return;
      }
      if (v === null) {
        row.appendChild(makeCell("-", true, true));
      } else {
        row.appendChild(makeCell(isAvgRow ? fmt1(v) : fmt0(v), true, false));
      }
    });

    const active = values.filter((v, i) => mask[i] && v !== null);
    const statTd = (n) => {
      const td = el("td", "col-num num stat-cell", n);
      return td;
    };
    if (active.length) {
      row.appendChild(statTd(fmt0(Math.max(...active))));
      row.appendChild(statTd(fmt0(Math.min(...active))));
      row.appendChild(statTd(fmt1(active.reduce((a, b) => a + b, 0) / active.length)));
    } else {
      row.appendChild(statTd("-"));
      row.appendChild(statTd("-"));
      row.appendChild(statTd("-"));
    }

    return row;
  }

  /* ========================================================
     全体描画
     ======================================================== */
  function renderAll() {
    renderTabs();
    renderInput();
    renderDetail();
    renderOverall();
  }

  /* ========================================================
     書き出し / 読み込み / 削除
     ======================================================== */
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");
    a.href = url;
    a.download = `test-scores-${ymd}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importDataFromFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("形式が正しくありません");
      }
      const ok = await AppDialog.confirm(
        "読み込んだ内容で、現在保存されているデータを上書きします。よろしいですか？",
        { title: "データの読み込み", okText: "上書きする", cancelText: "キャンセル", danger: true }
      );
      if (!ok) return;
      data = parsed;
      persist();
      renderAll();
      await AppDialog.alert("データを読み込みました。");
    } catch (e) {
      console.error(e);
      await AppDialog.alert("ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。", { title: "エラー" });
    }
  }

  async function resetData() {
    const ok = await AppDialog.confirm(
      "保存されているすべてのテスト結果を削除します。書き出したJSONファイルがない場合、元に戻せません。",
      { title: "全データを削除", okText: "削除する", cancelText: "キャンセル", danger: true }
    );
    if (!ok) return;
    data = {};
    persist();
    renderAll();
  }

  /* ========================================================
     初期化
     ======================================================== */
  function init() {
    renderAll();

    document.getElementById("export-btn").addEventListener("click", exportData);
    document.getElementById("import-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importDataFromFile(file);
      e.target.value = "";
    });
    document.getElementById("reset-btn").addEventListener("click", resetData);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
