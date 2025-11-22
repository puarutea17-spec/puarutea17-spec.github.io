/* =========================================================
   Interactive Paper - フルリセット版（DnD + 折りたたみ + 進捗バー + 移動ボタン）
========================================================= */

/* ------------------------------
   ユーティリティ
------------------------------ */
const qs  = (sel, base = document) => base.querySelector(sel);
const qsa = (sel, base = document) => [...base.querySelectorAll(sel)];

/* ローカルストレージキー */
const STORAGE_KEY = "interactivePaper_v3";

/* データモデル */
let paperData = {
  schemaVersion: 3,
  title: "タイトル",
  sections: []   // {id, title, text, checklist[], subsections[], collapsed?}
};

/* ------------------------------
   ID 生成
------------------------------ */
function genId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

/* ------------------------------
   ローカルストレージ 保存
------------------------------ */
function saveToLocal() {
  try {
    const json = JSON.stringify(paperData, null, 2);
    localStorage.setItem(STORAGE_KEY, json);
    console.log("保存しました");
  } catch (e) {
    console.error("保存失敗:", e);
  }
}

/* ------------------------------
   ローカルストレージ 読込
------------------------------ */
function loadFromLocal() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    applyLoadedJSON(data);
  } catch (e) {
    console.error("読み込み失敗:", e);
  }
}

/* ------------------------------
   JSON を適用
------------------------------ */
function applyLoadedJSON(data) {
  if (!data || typeof data !== "object") return;

  paperData = {
    schemaVersion: 3,
    title: data.title || "タイトル",
    sections: Array.isArray(data.sections) ? data.sections : []
  };

  qs("#page-title").textContent = paperData.title;
  document.title = paperData.title || "Interactive Paper";

  renderSections();
  attachEditEvents();
}

/* ------------------------------
   debounce 保存
------------------------------ */
let debounceTimer = null;
function debounceSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    collectAllData();
    saveToLocal();
    updateAllProgressBars();
  }, 300);
}

/* =========================================================
   描画処理
========================================================= */

/* すべてのセクション描画 */
function renderSections() {
  const container = qs("#sections");
  if (!container) return;

  container.innerHTML = "";

  (paperData.sections || []).forEach(secData => {
    const el = renderOneSection(secData);
    container.appendChild(el);
  });

  updateAllProgressBars();
}

/* セクション 1 つ描画 */
function renderOneSection(secData) {
  if (!secData.id) secData.id = genId("sec");

  const section = document.createElement("section");
  section.className = "section";
  section.dataset.secId = secData.id;
  section.dataset.dnd = "section";
  section.draggable = true;

  if (secData.collapsed) {
    section.classList.add("collapsed");
  }

  // ヘッダ
  const header = document.createElement("div");
  header.className = "section-header";

  const h2 = document.createElement("h2");
  h2.className = "section-title";
  h2.contentEditable = "true";
  h2.textContent = secData.title || "新しいセクション";

  const tools = document.createElement("div");
  tools.className = "section-tools";

  // 折りたたみボタン
  const foldBtn = document.createElement("button");
  foldBtn.className = "toggle-fold";
  foldBtn.type = "button";
  foldBtn.textContent = secData.collapsed ? "?" : "▼";

  const btnAddCheck = document.createElement("button");
  btnAddCheck.className = "add-check-h2";
  btnAddCheck.type = "button";
  btnAddCheck.textContent = "＋ 項目";

  const btnAddSub = document.createElement("button");
  btnAddSub.className = "add-subsection";
  btnAddSub.type = "button";
  btnAddSub.textContent = "＋ 小見出し";

  const btnUp = document.createElement("button");
  btnUp.className = "move-up";
  btnUp.type = "button";
  btnUp.textContent = "↑";

  const btnDown = document.createElement("button");
  btnDown.className = "move-down";
  btnDown.type = "button";
  btnDown.textContent = "↓";

  const btnDelSec = document.createElement("button");
  btnDelSec.className = "delete-section";
  btnDelSec.type = "button";
  btnDelSec.textContent = "× セクション削除";

  tools.append(foldBtn, btnAddCheck, btnAddSub, btnUp, btnDown, btnDelSec);
  header.append(h2, tools);

  // 本文
  const body = document.createElement("div");
  body.className = "section-body";

  // 進捗バー
  const progressWrap = document.createElement("div");
  progressWrap.className = "progress-bar-wrap";

  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  progressWrap.append(progressBar);

  const textDiv = document.createElement("div");
  textDiv.className = "section-text";
  textDiv.contentEditable = "true";
  textDiv.textContent = secData.text || "";

  // H2直下チェックリスト
  const ulH2 = document.createElement("ul");
  ulH2.className = "checklist";
  ulH2.dataset.scope = "h2";

  (secData.checklist || []).forEach(item => {
    const li = createChecklistItem(item);
    ulH2.appendChild(li);
  });

  // 小見出しコンテナ
  const subsWrap = document.createElement("div");
  subsWrap.className = "subsections";

  (secData.subsections || []).forEach(sub => {
    const subEl = renderOneSubsection(sub);
    subsWrap.appendChild(subEl);
  });

  body.append(progressWrap, textDiv, ulH2, subsWrap);
  section.append(header, body);

  return section;
}

/* 小見出し描画 */
function renderOneSubsection(subData) {
  if (!subData.id) subData.id = genId("sub");

  const wrap = document.createElement("div");
  wrap.className = "subsection";
  wrap.dataset.subId = subData.id;
  wrap.dataset.dnd = "subsection";
  wrap.draggable = true;

  const h3 = document.createElement("h3");
  h3.className = "subsection-title";
  h3.contentEditable = "true";
  h3.textContent = subData.title || "小見出し";

  const textDiv = document.createElement("div");
  textDiv.className = "section-text";
  textDiv.contentEditable = "true";
  textDiv.textContent = subData.text || "";

  const ul = document.createElement("ul");
  ul.className = "checklist";
  ul.dataset.scope = "h3";

  (subData.checklist || []).forEach(item => {
    const li = createChecklistItem(item);
    ul.appendChild(li);
  });

  const tools = document.createElement("div");
  tools.className = "subsection-tools";

  const btnAddCheck = document.createElement("button");
  btnAddCheck.className = "add-check-h3";
  btnAddCheck.type = "button";
  btnAddCheck.textContent = "＋ 項目";

  const btnDelSub = document.createElement("button");
  btnDelSub.className = "delete-subsection";
  btnDelSub.type = "button";
  btnDelSub.textContent = "× 小見出し削除";

  tools.append(btnAddCheck, btnDelSub);

  wrap.append(h3, textDiv, ul, tools);
  return wrap;
}

/* チェックリストアイテム描画 */
function createChecklistItem(item) {
  if (!item.id) item.id = genId("chk");

  const li = document.createElement("li");
  li.dataset.chkId = item.id;
  li.dataset.dnd = "check";
  li.draggable = true;

  const main = document.createElement("div");
  main.className = "check-main";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!item.checked;

  const textDiv = document.createElement("div");
  textDiv.className = "item-text";
  textDiv.contentEditable = "true";
  textDiv.textContent = item.text || "";

  main.append(input, textDiv);

  const idSpan = document.createElement("span");
  idSpan.className = "id-note";
  idSpan.textContent = item.id;

  const delBtn = document.createElement("button");
  delBtn.className = "delete-item";
  delBtn.title = "削除";
  delBtn.type = "button";
  delBtn.textContent = "×";

  li.append(main, idSpan, delBtn);
  return li;
}

/* =========================================================
   DOM → paperData 反映
========================================================= */
function collectAllData() {
  const titleEl = qs("#page-title");
  paperData.title = (titleEl?.textContent || "タイトル").trim();
  document.title = paperData.title || "Interactive Paper";

  const sectionsWrap = qs("#sections");
  if (!sectionsWrap) return;

  const secEls = qsa(".section", sectionsWrap);
  const sections = [];

  secEls.forEach(secEl => {
    const secId = secEl.dataset.secId || genId("sec");
    const titleEl = qs(".section-title", secEl);
    const bodyEl  = qs(".section-body > .section-text", secEl);
    const ulH2    = qs('ul.checklist[data-scope="h2"]', secEl);
    const subsWrap = qs(".subsections", secEl);

    const secObj = {
      id: secId,
      title: (titleEl?.textContent || "").trim(),
      text:  (bodyEl?.textContent || "").trim(),
      checklist: [],
      subsections: [],
      collapsed: secEl.classList.contains("collapsed")
    };

    // H2 直下チェック
    if (ulH2) {
      qsa("li", ulH2).forEach(li => {
        const chkId  = li.dataset.chkId || genId("chk");
        const textEl = qs(".item-text", li);
        const input  = qs('input[type="checkbox"]', li);

        secObj.checklist.push({
          id: chkId,
          text: (textEl?.textContent || "").trim(),
          checked: !!(input && input.checked)
        });
      });
    }

    // 小見出し
    if (subsWrap) {
      qsa(".subsection", subsWrap).forEach(subEl => {
        const subId      = subEl.dataset.subId || genId("sub");
        const subTitleEl = qs(".subsection-title", subEl);
        const subTextEl  = qs(".section-text", subEl);
        const ulH3       = qs('ul.checklist[data-scope="h3"]', subEl);

        const subObj = {
          id: subId,
          title: (subTitleEl?.textContent || "").trim(),
          text:  (subTextEl?.textContent || "").trim(),
          checklist: []
        };

        if (ulH3) {
          qsa("li", ulH3).forEach(li => {
            const chkId  = li.dataset.chkId || genId("chk");
            const textEl = qs(".item-text", li);
            const input  = qs('input[type="checkbox"]', li);

            subObj.checklist.push({
              id: chkId,
              text: (textEl?.textContent || "").trim(),
              checked: !!(input && input.checked)
            });
          });
        }

        secObj.subsections.push(subObj);
      });
    }

    sections.push(secObj);
  });

  paperData.sections = sections;
}

/* =========================================================
   進捗バー更新
========================================================= */
function updateAllProgressBars() {
  qsa(".section").forEach(sec => {
    const checks = qsa('input[type="checkbox"]', sec);
    const done = checks.filter(c => c.checked).length;
    const all = checks.length || 1;
    const percent = Math.round((done / all) * 100);

    const bar = qs(".progress-bar", sec);
    if (!bar) return;

    bar.style.width = percent + "%";

    // ざっくり色も変える
    if (percent === 0) {
      bar.style.backgroundColor = "#ef5350"; // 赤
    } else if (percent < 50) {
      bar.style.backgroundColor = "#ffb300"; // 黄
    } else if (percent < 100) {
      bar.style.backgroundColor = "#42a5f5"; // 青
    } else {
      bar.style.backgroundColor = "#66bb6a"; // 緑
    }
  });
}

/* =========================================================
   編集系イベント（input / checkbox）
========================================================= */
function attachEditEvents() {
  const container = qs("#sections");
  if (!container) return;

  // contenteditable
  qsa("[contenteditable=true]", container).forEach(el => {
    el.oninput = () => {
      debounceSave();
    };
  });

  // checkbox
  qsa('input[type="checkbox"]', container).forEach(chk => {
    chk.onchange = () => {
      debounceSave();
    };
  });

  updateAllProgressBars();
}

/* =========================================================
   クリック系（追加・削除・折りたたみ・移動） - イベント委譲
========================================================= */
function setupClickHandlers() {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // トップバー
    if (btn.id === "add-section") {
      handleAddSection();
      return;
    }
    if (btn.id === "export-json") {
      handleExportJSON();
      return;
    }
    if (btn.id === "import-json") {
      handleImportJSON();
      return;
    }

    // 折りたたみ
    if (btn.classList.contains("toggle-fold")) {
      const sec = btn.closest(".section");
      if (!sec) return;
      sec.classList.toggle("collapsed");
      btn.textContent = sec.classList.contains("collapsed") ? "?" : "▼";
      debounceSave();
      return;
    }

    // セクション ↑
    if (btn.classList.contains("move-up")) {
      const sec = btn.closest(".section");
      if (!sec) return;
      const prev = sec.previousElementSibling;
      if (prev) prev.before(sec);
      debounceSave();
      return;
    }

    // セクション ↓
    if (btn.classList.contains("move-down")) {
      const sec = btn.closest(".section");
      if (!sec) return;
      const next = sec.nextElementSibling;
      if (next) next.after(sec);
      debounceSave();
      return;
    }

    // 以下はセクション内の操作
    if (btn.classList.contains("add-check-h2")) {
      const secEl = btn.closest(".section");
      if (!secEl) return;
      const ul = qs('ul.checklist[data-scope="h2"]', secEl);
      if (!ul) return;

      const li = createChecklistItem({ id: genId("chk"), text: "", checked: false });
      ul.appendChild(li);
      attachEditEvents();
      debounceSave();
      return;
    }

    if (btn.classList.contains("add-subsection")) {
      const secEl = btn.closest(".section");
      if (!secEl) return;

      const subsWrap = qs(".subsections", secEl);
      if (!subsWrap) return;

      const subObj = {
        id: genId("sub"),
        title: "小見出し",
        text: "",
        checklist: []
      };
      const subEl = renderOneSubsection(subObj);
      subsWrap.appendChild(subEl);
      attachEditEvents();
      debounceSave();
      return;
    }

    if (btn.classList.contains("delete-section")) {
      const secEl = btn.closest(".section");
      if (!secEl) return;
      secEl.remove();
      debounceSave();
      return;
    }

    if (btn.classList.contains("add-check-h3")) {
      const subEl = btn.closest(".subsection");
      if (!subEl) return;
      const ul = qs('ul.checklist[data-scope="h3"]', subEl);
      if (!ul) return;
      const li = createChecklistItem({ id: genId("chk"), text: "", checked: false });
      ul.appendChild(li);
      attachEditEvents();
      debounceSave();
      return;
    }

    if (btn.classList.contains("delete-subsection")) {
      const subEl = btn.closest(".subsection");
      if (!subEl) return;
      subEl.remove();
      debounceSave();
      return;
    }

    if (btn.classList.contains("delete-item")) {
      const li = btn.closest("li[data-chk-id]");
      if (!li) return;
      li.remove();
      debounceSave();
      return;
    }
  });
}

/* ------------------------------
   トップバーの処理
------------------------------ */
function handleAddSection() {
  const newSec = {
    id: genId("sec"),
    title: "新しいセクション",
    text: "",
    checklist: [],
    subsections: [],
    collapsed: false
  };
  paperData.sections.push(newSec);
  renderSections();
  attachEditEvents();
  saveToLocal();
}

function handleExportJSON() {
  collectAllData();
  const blob = new Blob(
    [JSON.stringify(paperData, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (paperData.title || "interactive-paper") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportJSON() {
  const input = qs("#json-file-input");
  if (!input) return;
  input.value = "";
  input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        applyLoadedJSON(json);
        saveToLocal();
      } catch (err) {
        alert("JSON の読み込みに失敗しました");
      }
    };
    reader.readAsText(file, "utf-8");
  };
}

/* =========================================================
   DnD - セクション & 小見出し & チェックリスト
========================================================= */

let dragState = {
  type: null,   // "section" | "check" | "subsection"
  elem: null
};

function setupDnD() {
  const container = qs("#sections");
  if (!container) return;

  container.addEventListener("dragstart", onDragStart);
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);
  container.addEventListener("dragend", onDragEnd);
}

function onDragStart(e) {
  const handle = e.target.closest("[data-dnd]");
  if (!handle) return;

  dragState.type = handle.dataset.dnd;
  dragState.elem = handle;

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "");
  handle.classList.add("dragging");
}

function onDragOver(e) {
  if (!dragState.elem) return;

  // チェック項目（どの checklist でもOK）
  if (dragState.type === "check") {
    const li = e.target.closest('[data-dnd="check"]');
    const ul = e.target.closest("ul.checklist");
    if (!li && !ul) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return;
  }

  const target = e.target.closest("[data-dnd]");
  if (!target) return;
  if (target === dragState.elem) return;
  if (target.dataset.dnd !== dragState.type) return;

  // section/subsection は同じ親コンテナ内のみ
  if (dragState.type === "subsection") {
    const originWrap = dragState.elem.closest(".subsections");
    const targetWrap = target.closest(".subsections");
    if (!originWrap || !targetWrap || originWrap !== targetWrap) return;
  } else if (dragState.type === "section") {
    const originParent = dragState.elem.parentElement;
    const targetParent = target.parentElement;
    if (!originParent || !targetParent || originParent !== targetParent) return;
  }

  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function onDrop(e) {
  if (!dragState.elem) return;

  // チェック項目
  if (dragState.type === "check") {
    e.preventDefault();
    e.stopPropagation();

    const dragEl = dragState.elem;

    const targetLi = e.target.closest('[data-dnd="check"]');
    let targetUl = null;

    if (targetLi) {
      targetUl = targetLi.closest("ul.checklist");
    }
    if (!targetUl) {
      targetUl = e.target.closest("ul.checklist");
    }
    if (!targetUl) return;

    const rect = targetLi ? targetLi.getBoundingClientRect() : null;

    if (!targetLi) {
      targetUl.appendChild(dragEl);
    } else {
      const isAfter = e.clientY > rect.top + rect.height / 2;
      if (isAfter) {
        targetUl.insertBefore(dragEl, targetLi.nextSibling);
      } else {
        targetUl.insertBefore(dragEl, targetLi);
      }
    }

    debounceSave();
    updateAllProgressBars();
    return;
  }

  // セクション / サブセクション
  const target = e.target.closest("[data-dnd]");
  if (!target) return;
  if (target === dragState.elem) return;
  if (target.dataset.dnd !== dragState.type) return;

  let parent = null;

  if (dragState.type === "subsection") {
    const originWrap = dragState.elem.closest(".subsections");
    const targetWrap = target.closest(".subsections");
    if (!originWrap || !targetWrap || originWrap !== targetWrap) return;
    parent = originWrap;
  } else if (dragState.type === "section") {
    const originParent = dragState.elem.parentElement;
    const targetParent = target.parentElement;
    if (!originParent || !targetParent || originParent !== targetParent) return;
    parent = originParent;
  }

  if (!parent) return;

  const dragEl = dragState.elem;
  const rect = target.getBoundingClientRect();
  const isAfter = e.clientY > rect.top + rect.height / 2;

  if (isAfter) {
    parent.insertBefore(dragEl, target.nextSibling);
  } else {
    parent.insertBefore(dragEl, target);
  }

  debounceSave();
}

function onDragEnd() {
  if (dragState.elem) {
    dragState.elem.classList.remove("dragging");
  }
  dragState.type = null;
  dragState.elem = null;
}

/* =========================================================
   初期化
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  const titleEl = qs("#page-title");
  if (titleEl) {
    titleEl.addEventListener("input", () => {
      debounceSave();
    });
  }

  setupClickHandlers();
  setupDnD();
  loadFromLocal();

  if (paperData.sections.length === 0) {
    paperData.sections.push({
      id: genId("sec"),
      title: "新しいセクション",
      text: "",
      checklist: [],
      subsections: [],
      collapsed: false
    });
    renderSections();
    attachEditEvents();
    saveToLocal();
  } else {
    attachEditEvents();
  }
});
