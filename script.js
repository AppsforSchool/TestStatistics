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
  const SUBJECT_COLOR_HEX = {
    "国語": "#d8434b",
    "社会": "#b93fb3",
    "数学": "#2f7fd6",
    "理科": "#2f9e57",
    "英語": "#dd8b2e",
    "保健体育": "#2aa3ae",
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
        refreshDependentViews();
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
        refreshDependentViews();
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
    const final = isFinalTest(currentTest);
    let totalScore = 0, totalAvg = 0; // 5教科（基本教科）のみ
    let hokenScore = null, hokenAvg = null;

    subjects.forEach((subject) => {
      const { score, average } = getEntry(currentTest, subject);
      const a = average ?? 0;

      if (subject === EXTRA_SUBJECT) {
        hokenScore = score;
        hokenAvg = average;
      } else {
        totalScore += score ?? 0;
        totalAvg += a;
      }

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

    const n = BASE_SUBJECTS.length;
    const totalRow = el("tr", "row-total");
    totalRow.appendChild(el("td", null, "5教科合計"));
    totalRow.appendChild(makeCell(fmt0(totalScore), true, false));
    totalRow.appendChild(makeCell(fmt0(totalScore - 100 * n), true, false));
    totalRow.appendChild(makeCell(fmt1(totalAvg), true, false));
    totalRow.appendChild(makeCell(fmt1(totalScore - totalAvg), true, false));
    totalRow.appendChild(makeCell("-", true, true));
    body.appendChild(totalRow);

    const avgRow = el("tr", "row-avg");
    avgRow.appendChild(el("td", null, "5教科平均"));
    avgRow.appendChild(makeCell(fmt1(totalScore / n), true, false));
    avgRow.appendChild(makeCell(fmt1(totalScore / n - 100), true, false));
    avgRow.appendChild(makeCell(fmt1(totalAvg / n), true, false));
    avgRow.appendChild(makeCell(fmt1((totalScore - totalAvg) / n), true, false));
    avgRow.appendChild(makeCell("-", true, true));
    body.appendChild(avgRow);

    if (final) {
      const nAll = n + 1;
      const allScore = totalScore + (hokenScore ?? 0);
      const allAvg = totalAvg + (hokenAvg ?? 0);
      const hasAny = hokenScore !== null || totalScore > 0;

      const allRow = el("tr", "row-total");
      allRow.appendChild(el("td", null, "全合計（5教科＋保健体育）"));
      allRow.appendChild(makeCell(fmt0(allScore), true, false));
      allRow.appendChild(makeCell(fmt0(allScore - 100 * nAll), true, false));
      allRow.appendChild(makeCell(fmt1(allAvg), true, false));
      allRow.appendChild(makeCell(fmt1(allScore - allAvg), true, false));
      allRow.appendChild(makeCell(hasAny && allAvg ? fmt1((allScore / allAvg) * 100) + "%" : "-", true, !(hasAny && allAvg)));
      body.appendChild(allRow);
    }
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

    body.appendChild(buildOverallRow("5教科合計", null, totalPerTest, TESTS.map(() => true), "row-total", true));
    body.appendChild(buildOverallRow("5教科平均", null, avgPerTest, TESTS.map(() => true), "row-avg", true, true));

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
     グラフ
     ======================================================== */
  const CHART_TYPE_LABELS = {
    stacked: "得点の内訳",
    ratio: "平均との割合",
    subject: "教科別の推移",
  };
  let currentChartType = "stacked";
  let currentChartSubject = BASE_SUBJECTS[0];
  let chartInstance = null;
  let datalabelsRegistered = false;

  function ensureDatalabelsRegistered() {
    if (datalabelsRegistered) return;
    if (typeof Chart !== "undefined" && typeof ChartDataLabels !== "undefined") {
      Chart.register(ChartDataLabels);
      Chart.defaults.font.family = "'BIZ UDGothic', sans-serif";
      datalabelsRegistered = true;
    }
  }

  function renderChartTabs() {
    const wrap = document.getElementById("chart-type-tabs");
    wrap.innerHTML = "";
    Object.entries(CHART_TYPE_LABELS).forEach(([key, label]) => {
      const btn = el("button", "test-tab", label);
      btn.type = "button";
      if (key === currentChartType) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentChartType = key;
        renderChartTabs();
        renderChartSubjectTabs();
        renderChart();
      });
      wrap.appendChild(btn);
    });
  }

  function renderChartSubjectTabs() {
    const wrap = document.getElementById("chart-subject-tabs");
    const show = currentChartType === "subject";
    wrap.classList.toggle("hidden", !show);
    if (!show) return;
    wrap.innerHTML = "";
    BASE_SUBJECTS.forEach((subject) => {
      const btn = el("button", "test-tab", subject);
      btn.type = "button";
      if (subject === currentChartSubject) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentChartSubject = subject;
        renderChartSubjectTabs();
        renderChart();
      });
      wrap.appendChild(btn);
    });
  }

  function testsWithAnyScore(subjectList) {
    return TESTS.filter((t) => subjectList.some((s) => getEntry(t, s).score !== null));
  }

  function buildStackedConfig() {
    const labels = testsWithAnyScore(BASE_SUBJECTS);
    if (!labels.length) return null;
    const datasets = BASE_SUBJECTS.map((subject) => ({
      label: subject,
      data: labels.map((t) => getEntry(t, subject).score ?? 0),
      backgroundColor: SUBJECT_COLOR_HEX[subject],
      stack: "total",
    }));
    return {
      type: "bar",
      data: { labels, datasets },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, beginAtZero: true, title: { display: true, text: "5教科合計点" } },
          y: { stacked: true },
        },
        plugins: {
          legend: { position: "top" },
          datalabels: {
            color: "#fff",
            font: { weight: "bold", size: 11 },
            formatter: (v) => (v > 0 ? v : ""),
          },
        },
      },
    };
  }

  function buildRatioConfig() {
    const labels = testsWithAnyScore(BASE_SUBJECTS);
    if (!labels.length) return null;

    const datasets = BASE_SUBJECTS.map((subject) => ({
      label: subject,
      data: labels.map((t) => {
        const { score, average } = getEntry(t, subject);
        return score !== null && average ? Math.round((score / average) * 1000) / 10 : null;
      }),
      borderColor: SUBJECT_COLOR_HEX[subject],
      backgroundColor: SUBJECT_COLOR_HEX[subject],
      spanGaps: true,
      tension: 0.25,
      pointRadius: 3,
    }));

    const totalData = labels.map((t) => {
      const scores = BASE_SUBJECTS.map((s) => getEntry(t, s).score).filter((v) => v !== null);
      const avgs = BASE_SUBJECTS.map((s) => getEntry(t, s).average).filter((v) => v !== null);
      if (!scores.length || !avgs.length) return null;
      const ts = scores.reduce((a, b) => a + b, 0);
      const ta = avgs.reduce((a, b) => a + b, 0);
      return ta ? Math.round((ts / ta) * 1000) / 10 : null;
    });
    datasets.push({
      label: "5教科合計",
      data: totalData,
      borderColor: "#333b55",
      backgroundColor: "#333b55",
      borderWidth: 3,
      spanGaps: true,
      tension: 0.25,
      pointRadius: 3,
    });
    datasets.push({
      label: "点数平均(100%)",
      data: labels.map(() => 100),
      borderColor: "#9aa0b4",
      backgroundColor: "#9aa0b4",
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      spanGaps: true,
      datalabels: { display: false },
    });

    return {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v) => v + "%" } } },
        plugins: {
          legend: { position: "top" },
          datalabels: {
            align: "top",
            font: { size: 10 },
            formatter: (v) => (v === null || v === undefined ? "" : v + "%"),
          },
        },
      },
    };
  }

  function buildSubjectConfig(subject) {
    const labels = TESTS.filter((t) => {
      const e = getEntry(t, subject);
      return e.score !== null || e.average !== null;
    });
    if (!labels.length) return null;
    const scoreData = labels.map((t) => getEntry(t, subject).score);
    const avgData = labels.map((t) => getEntry(t, subject).average);
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${subject}（得点）`,
            data: scoreData,
            borderColor: SUBJECT_COLOR_HEX[subject],
            backgroundColor: SUBJECT_COLOR_HEX[subject],
            borderWidth: 3,
            spanGaps: true,
            tension: 0.2,
            pointRadius: 4,
          },
          {
            label: `${subject}（平均点）`,
            data: avgData,
            borderColor: "#b7bcd1",
            backgroundColor: "#b7bcd1",
            borderWidth: 2,
            borderDash: [5, 3],
            spanGaps: true,
            tension: 0.2,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, suggestedMax: 100 } },
        plugins: {
          legend: { position: "top" },
          datalabels: {
            align: "top",
            font: { size: 10 },
            formatter: (v) => (v === null || v === undefined ? "" : v),
          },
        },
      },
    };
  }

  function renderChart() {
    const canvas = document.getElementById("main-chart");
    const emptyHint = document.getElementById("chart-empty-hint");
    if (!canvas) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (typeof Chart === "undefined") {
      emptyHint.textContent = "グラフライブラリを読み込めませんでした。インターネット接続をご確認ください。";
      emptyHint.classList.remove("hidden");
      canvas.classList.add("hidden");
      return;
    }
    ensureDatalabelsRegistered();

    let config = null;
    if (currentChartType === "stacked") config = buildStackedConfig();
    else if (currentChartType === "ratio") config = buildRatioConfig();
    else config = buildSubjectConfig(currentChartSubject);

    if (!config) {
      emptyHint.textContent = "まだ得点が入力されていないため、グラフを表示できません。";
      emptyHint.classList.remove("hidden");
      canvas.classList.add("hidden");
      return;
    }
    emptyHint.classList.add("hidden");
    canvas.classList.remove("hidden");
    chartInstance = new Chart(canvas.getContext("2d"), config);
  }

  function renderCharts() {
    renderChartTabs();
    renderChartSubjectTabs();
    renderChart();
  }

  /* ========================================================
     全体描画
     ======================================================== */
  function renderAll() {
    renderTabs();
    renderInput();
    renderDetail();
    renderOverall();
    renderCharts();
  }

  function refreshDependentViews() {
    renderDetail();
    renderOverall();
    renderChart();
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
