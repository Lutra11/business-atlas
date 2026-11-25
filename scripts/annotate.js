var __zgciAnnot = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // AppData/Local/hermes/skills/web/annotation-driven-prototyping/templates/annotate.ts
  var annotate_exports = {};
  __export(annotate_exports, {
    clearAll: () => clearAll,
    exportAll: () => exportAll,
    init: () => init,
    listAll: () => listAll,
    markDone: () => markDone,
    toggle: () => toggle
  });
  var KEY = "zgci.annotations.v1";
  var enabled = false;
  var styleEl = null;
  var bar = null;
  var pop = null;
  var flashEl = null;
  var flashTimer = null;
  var clearArmed = false;
  var clearTimer = null;
  var hovered = null;
  var pick = null;
  var areaMode = false;
  var marquee = null;
  var areaStart = null;
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }
  function persist(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }
  function buildSelector(el) {
    if (el.id) return `#${el.id}`;
    for (const attr of ["data-ref", "data-testid"]) {
      const v = el.getAttribute(attr);
      if (v) return `${el.tagName.toLowerCase()}[${attr}="${v}"]`;
    }
    const cls = [...el.classList].filter((c) => !/^(v-|el-|is-)/.test(c)).slice(0, 3);
    if (cls.length) {
      const s = `${el.tagName.toLowerCase()}.${cls.join(".")}`;
      try {
        if (document.querySelectorAll(s).length === 1) return s;
      } catch {
      }
    }
    const parts = [];
    let cur = el;
    for (let i = 0; cur && i < 5; i++) {
      const idx = cur.parentElement ? [...cur.parentElement.children].indexOf(cur) + 1 : 1;
      parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${idx})`);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  function readableLabel(el) {
    let t = el;
    for (let i = 0; t && i < 3; i++) {
      const txt = (t.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60);
      if (txt) return txt;
      const ph = t.getAttribute && (t.getAttribute("placeholder") || t.getAttribute("aria-label"));
      if (ph) return `[${ph}]`;
      t = t.parentElement;
    }
    const cls = [...el.classList].slice(0, 3).join(".");
    return cls || el.tagName.toLowerCase();
  }
  function ownUi(t) {
    return !!t && !!t.closest && !!t.closest(".zgci-annot-ui");
  }
  function ensureStyle() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.textContent = `
#zgci-annot-bar { position: fixed; right: 14px; bottom: 14px; z-index: 2147483000;
  display: flex; gap: 4px; padding: 5px; border-radius: 10px;
  background: rgba(28,30,36,.92); border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 4px 16px rgba(0,0,0,.35); font: 12px/1.4 system-ui, sans-serif; user-select: none; }
#zgci-annot-bar button { all: unset; cursor: pointer; padding: 5px 10px; border-radius: 6px; color: #e8eaf0; }
#zgci-annot-bar button:hover { background: rgba(255,255,255,.12); }
#zgci-annot-bar button.on { background: #409eff; color: #fff; }
#zgci-annot-bar button.dim { opacity: .35; pointer-events: none; }
body.__zgci_annotate_mode, body.__zgci_annotate_mode *:not(.zgci-annot-ui):not(.zgci-annot-ui *) { cursor: crosshair !important; }
#zgci-annot-bar, #zgci-annot-bar *, #zgci-annot-pop, #zgci-annot-pop * { cursor: auto !important; }
.zgci-annot-hover { outline: 2px dashed #f56c6c !important; outline-offset: 1px; }
.zgci-annot-pick { outline: 3px solid #f56c6c !important; outline-offset: 1px; }
.zgci-annot-badge { position: absolute; top: -10px; right: -4px; z-index: 2147483000;
  background: #f56c6c; color: #fff; font: 11px/1 monospace; padding: 3px 6px;
  border-radius: 4px; pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
#zgci-annot-pop { position: fixed; z-index: 2147483000; width: 260px; padding: 10px;
  background: #1c1e24; color: #e8eaf0; border: 1px solid rgba(255,255,255,.16);
  border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.4); font: 12px/1.5 system-ui, sans-serif; }
#zgci-annot-pop .zgci-tip { color: #9aa0ac; margin-bottom: 6px; max-height: 3.2em; overflow: hidden; }
#zgci-annot-pop textarea { width: 100%; box-sizing: border-box; height: 64px; resize: vertical;
  background: #12141a; color: #e8eaf0; border: 1px solid rgba(255,255,255,.2);
  border-radius: 6px; padding: 6px 8px; font: 12px/1.5 inherit; outline: none; }
#zgci-annot-pop textarea:focus { border-color: #409eff; }
#zgci-annot-pop .zgci-pop-row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; }
#zgci-annot-pop .zgci-pop-row button { cursor: pointer; padding: 4px 12px; border-radius: 6px; border: none; font: 12px inherit; }
#zgci-annot-pop .zgci-cancel { background: #2a2d35; color: #cfd3dc; }
#zgci-annot-pop .zgci-save { background: #409eff; color: #fff; }
.zgci-annot-flash { position: fixed; right: 14px; bottom: 56px; z-index: 2147483000;
  background: rgba(64,158,255,.92); color: #fff; font: 12px/1.4 system-ui, sans-serif;
  padding: 7px 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.3);
  max-width: 300px; pointer-events: none; }
#zgci-annot-marquee { position: fixed; z-index: 2147482900; border: 2px dashed #409eff;
  background: rgba(64,158,255,.12); pointer-events: none; border-radius: 4px; }
#zgci-annot-bar button.area.on { background: #67c23a; color: #fff; }
.zgci-annot-badge.zgci-annot-done, .zgci-annot-area-mark > span.zgci-annot-done { background: #9aa0ac !important; text-decoration: line-through; }
.zgci-annot-area-mark.zgci-annot-done-mark { border-color: rgba(154,160,172,.6) !important; background: rgba(154,160,172,.08) !important; }
.zgci-annot-area-mark { position: fixed; z-index: 2147482900; border: 2px solid rgba(64,158,255,.7);
  background: rgba(64,158,255,.06); border-radius: 4px; pointer-events: none; }
  .zgci-annot-area-mark > span { position: absolute; top: -20px; left: -2px; background: #409eff;
  color: #fff; font: 11px/1 monospace; padding: 3px 6px; border-radius: 4px; }
`;
    document.head.appendChild(styleEl);
  }
  function flash(msg) {
    if (!flashEl) {
      flashEl = document.createElement("div");
      flashEl.className = "zgci-annot-flash";
      document.body.appendChild(flashEl);
    }
    flashEl.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flashEl?.remove();
      flashEl = null;
    }, 2200);
  }
  function ensureBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.id = "zgci-annot-bar";
    bar.className = "zgci-annot-ui";
    const t = document.createElement("button");
    t.dataset.act = "toggle";
    const a = document.createElement("button");
    a.dataset.act = "area";
    a.className = "area";
    a.textContent = "\u2B1A \u5708\u9009";
    a.title = "\u5708\u9009\u6A21\u5F0F\uFF1A\u62D6\u62FD\u753B\u4E00\u4E2A\u533A\u57DF\uFF08\u6BD4\u5982\u6574\u5757\u8868\u683C/\u5361\u7247\uFF09\uFF0C\u7528\u4E8E\u201C\u8FD9\u91CC\u52A0\u5B57\u6BB5\u201D\u7C7B\u9700\u6C42";
    const c = document.createElement("button");
    c.dataset.act = "copy";
    c.textContent = "\u{1F4CB} \u590D\u5236";
    const s = document.createElement("button");
    s.dataset.act = "sync";
    s.textContent = "\u2713 \u5DF2\u5904\u7406";
    s.title = "\u540C\u6B65 Hermes \u5DF2\u5904\u7406\u7684\u6279\u6CE8\uFF08\u8BFB\u53D6 /src/utils/annot-done.json\uFF09";
    const d = document.createElement("button");
    d.dataset.act = "clear";
    d.textContent = "\u{1F5D1}";
    d.title = "\u6E05\u7A7A\u5168\u90E8\u6807\u6CE8";
    bar.append(t, a, c, s, d);
    bar.addEventListener("click", (e) => {
      const b = e.target.closest?.("button");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "toggle") toggle();
      else if (act === "area") toggleArea();
      else if (act === "copy") void copyAll();
      else if (act === "sync") void syncDone();
      else if (act === "clear") armClear();
    });
    document.body.appendChild(bar);
    updateBar();
  }
  async function syncDone() {
    const url = "/src/utils/annot-done.json?t=" + Date.now();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const ids = Array.isArray(data.done) ? data.done : [];
      if (!ids.length) {
        flash("\u8FD8\u6CA1\u6709\u5DF2\u5904\u7406\u8BB0\u5F55");
        return;
      }
      const n = markDone(ids);
      flash(n ? `\u5DF2\u540C\u6B65\uFF1A${n} \u6761\u6279\u6CE8\u6807\u8BB0\u4E3A\u5DF2\u5904\u7406` : "\u8FD9\u4E9B\u6279\u6CE8\u4E4B\u524D\u5DF2\u6807\u8BB0\u8FC7");
    } catch {
      flash("\u8BFB\u53D6\u5931\u8D25\uFF1A\u8FD8\u6CA1\u6709\u5DF2\u5904\u7406\u8BB0\u5F55\u6587\u4EF6");
    }
  }
  function updateBar() {
    if (!bar) return;
    const all = load();
    const n = all.filter((a2) => !a2.done).length;
    const doneN = all.length - n;
    const [t, a, c] = bar.querySelectorAll("button");
    t.textContent = `\u{1F3F7} \u6807\u6CE8 \xB7 ${n}${doneN ? `\uFF08\u2713${doneN}\uFF09` : ""}`;
    t.classList.toggle("on", enabled);
    a.classList.toggle("on", areaMode && enabled);
    c.classList.toggle("dim", n === 0);
    c.title = n ? `\u590D\u5236 ${n} \u6761\u5F85\u5904\u7406\u6807\u6CE8\uFF08JSON\uFF09\uFF0C\u7C98\u8D34\u7ED9 Hermes` : "\u6CA1\u6709\u5F85\u5904\u7406\u7684\u6807\u6CE8";
  }
  async function copyText(s) {
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = s;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }
  async function copyAll() {
    const all = load();
    const pending = all.filter((a) => !a.done);
    if (!pending.length) {
      flash(all.length ? "\u5168\u90E8\u5DF2\u5904\u7406\u5B8C\u6BD5\uFF0C\u6CA1\u6709\u65B0\u6279\u6CE8" : "\u8FD8\u6CA1\u6709\u6807\u6CE8");
      return;
    }
    const ok = await copyText(JSON.stringify(pending, null, 2));
    const doneN = all.length - pending.length;
    flash(ok ? `\u5DF2\u590D\u5236 ${pending.length} \u6761\u5F85\u5904\u7406${doneN ? `\uFF08${doneN} \u6761\u5DF2\u5904\u7406\u4E0D\u518D\u590D\u5236\uFF09` : ""} \xB7 \u53BB\u804A\u5929\u6846\u7C98\u8D34` : "\u590D\u5236\u5931\u8D25\uFF1A\u63A7\u5236\u53F0\u8FD0\u884C window.__zgci.exportAnnots()");
  }
  function armClear() {
    if (clearArmed) {
      clearArmed = false;
      if (clearTimer) clearTimeout(clearTimer);
      clearAll();
      flash("\u5DF2\u6E05\u7A7A\u5168\u90E8\u6807\u6CE8");
      return;
    }
    clearArmed = true;
    flash("\u518D\u70B9\u4E00\u6B21 \u{1F5D1} \u786E\u8BA4\u6E05\u7A7A");
    clearTimer = setTimeout(() => {
      clearArmed = false;
    }, 2500);
  }
  function onOver(e) {
    const t = e.target;
    if (!t || !t.classList || ownUi(t) || t === document.body || t === document.documentElement) return;
    if (hovered && hovered !== t) hovered.classList.remove("zgci-annot-hover");
    hovered = t;
    t.classList.add("zgci-annot-hover");
  }
  function onOut(e) {
    const t = e.target;
    if (t && t === hovered) {
      t.classList.remove("zgci-annot-hover");
      hovered = null;
    }
  }
  function clearHover() {
    hovered?.classList.remove("zgci-annot-hover");
    hovered = null;
  }
  function closePop() {
    pop?.remove();
    pop = null;
    pick?.classList.remove("zgci-annot-pick");
    pick = null;
  }
  function openPop(t, x, y) {
    closePop();
    pick = t;
    t.classList.add("zgci-annot-pick");
    pop = document.createElement("div");
    pop.id = "zgci-annot-pop";
    pop.className = "zgci-annot-ui";
    const tip = document.createElement("div");
    tip.className = "zgci-tip";
    tip.textContent = `\u9009\u4E2D\uFF1A${readableLabel(t)}\uFF08${t.tagName}\uFF09`;
    const ta = document.createElement("textarea");
    ta.placeholder = "\u5199\u4F60\u7684\u4FEE\u6539\u610F\u89C1\u2026\uFF08Ctrl+Enter \u4FDD\u5B58\uFF09";
    const row = document.createElement("div");
    row.className = "zgci-pop-row";
    const cancel = document.createElement("button");
    cancel.className = "zgci-cancel";
    cancel.textContent = "\u53D6\u6D88";
    cancel.onclick = closePop;
    const save = document.createElement("button");
    save.className = "zgci-save";
    save.textContent = "\u4FDD\u5B58";
    const doSave = () => {
      const v = ta.value.trim();
      if (!v) {
        ta.focus();
        return;
      }
      savePending(t, v);
      closePop();
    };
    save.onclick = doSave;
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doSave();
      }
    });
    row.append(cancel, save);
    pop.append(tip, ta, row);
    const left = Math.min(x + 12, window.innerWidth - 276);
    const top = Math.min(y + 12, window.innerHeight - 170);
    pop.style.left = Math.max(8, left) + "px";
    pop.style.top = Math.max(8, top) + "px";
    document.body.appendChild(pop);
    ta.focus();
  }
  function savePending(t, text) {
    const r = t.getBoundingClientRect();
    const ann = {
      id: "AN-" + Date.now().toString(36).toUpperCase(),
      route: location.hash || location.pathname,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN"),
      text,
      kind: "element",
      selector: buildSelector(t),
      tag: t.tagName,
      classes: [...t.classList].filter((c) => !/^(v-|el-|is-|zgci-)/.test(c)).slice(0, 5),
      label: readableLabel(t),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
    const list = load();
    list.push(ann);
    persist(list);
    const b = document.createElement("span");
    b.className = "zgci-annot-badge";
    b.textContent = "#" + list.length;
    if (getComputedStyle(t).position === "static") t.style.position = "relative";
    t.appendChild(b);
    updateBar();
    flash(`\u5DF2\u8BB0\u5F55 #${list.length}\uFF08\u7EE7\u7EED\u70B9\u4E0B\u4E00\u4E2A\uFF0C\u6216 F9 \u5173\u95ED\uFF09`);
  }
  function toggleArea() {
    if (!enabled) {
      flash("\u5148\u5F00\u542F\u6807\u6CE8\u6A21\u5F0F\uFF08F9\uFF09\u518D\u7528\u5708\u9009");
      return false;
    }
    areaMode = !areaMode;
    if (areaMode) {
      bindArea();
      flash("\u5708\u9009\u6A21\u5F0F\uFF1A\u6309\u4F4F\u62D6\u4E00\u4E2A\u6846\uFF08\u6BD4\u5982\u6574\u5757\u8868\u683C\uFF09");
    } else {
      unbindArea();
      bindClick();
      flash("\u5708\u9009\u6A21\u5F0F\u5173\u95ED\uFF0C\u6062\u590D\u70B9\u9009");
    }
    updateBar();
    return areaMode;
  }
  function removeMarquee() {
    marquee?.remove();
    marquee = null;
  }
  function areaMouseDown(e) {
    const t = e.target;
    if (ownUi(t)) return;
    e.preventDefault();
    e.stopPropagation();
    clearHover();
    areaStart = { x: e.clientX, y: e.clientY };
    removeMarquee();
    marquee = document.createElement("div");
    marquee.id = "zgci-annot-marquee";
    marquee.className = "zgci-annot-ui";
    document.body.appendChild(marquee);
  }
  function areaMouseMove(e) {
    if (!areaStart || !marquee) return;
    const x = Math.min(areaStart.x, e.clientX);
    const y = Math.min(areaStart.y, e.clientY);
    const w = Math.abs(e.clientX - areaStart.x);
    const h = Math.abs(e.clientY - areaStart.y);
    marquee.style.left = x + "px";
    marquee.style.top = y + "px";
    marquee.style.width = w + "px";
    marquee.style.height = h + "px";
  }
  function areaMouseUp(e) {
    if (!areaStart || !marquee) return;
    const r = marquee.getBoundingClientRect();
    areaStart = null;
    const small = r.width < 8 || r.height < 8;
    removeMarquee();
    if (small) return;
    collectArea(r, e.clientX, e.clientY);
  }
  function collectArea(r, cx, cy) {
    const seen = /* @__PURE__ */ new Set();
    const covered = [];
    const all = document.querySelectorAll("body *");
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (!el.innerText && !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.children.length) continue;
      if (ownUi(el)) continue;
      const er = el.getBoundingClientRect();
      const cxm = er.x + er.width / 2;
      const cym = er.y + er.height / 2;
      if (cxm < r.x || cxm > r.x + r.width || cym < r.y || cym > r.y + r.height) continue;
      if (er.width < 2 || er.height < 2) continue;
      const label = readableLabel(el);
      if (!label || label === el.tagName.toLowerCase()) continue;
      const key = el.tagName + "|" + label + "|" + buildSelector(el);
      if (seen.has(key)) continue;
      seen.add(key);
      covered.push({
        tag: el.tagName,
        label,
        classes: [...el.classList].filter((c) => !/^(v-|el-|is-|zgci-)/.test(c)).slice(0, 4),
        selector: buildSelector(el)
      });
      if (covered.length >= 12) break;
    }
    openAreaPop(r, covered, cx, cy);
  }
  function openAreaPop(r, covered, cx, cy) {
    closePop();
    pop = document.createElement("div");
    pop.id = "zgci-annot-pop";
    pop.className = "zgci-annot-ui";
    const tip = document.createElement("div");
    tip.className = "zgci-tip";
    tip.textContent = `\u5708\u9009\u533A\u57DF ${Math.round(r.width)}\xD7${Math.round(r.height)}\uFF0C\u6846\u4F4F ${covered.length} \u4E2A\u5143\u7D20\uFF1A${covered.slice(0, 5).map((c) => c.label.slice(0, 8)).join("\u3001")}${covered.length > 5 ? "\u2026" : ""}`;
    const ta = document.createElement("textarea");
    ta.placeholder = "\u5199\u4F60\u7684\u610F\u89C1\u2026\uFF08\u5982\uFF1A\u8FD9\u4E2A\u8868\u683C\u589E\u52A0\u201C\u7ECF\u8D39\u6267\u884C\u7387\u201D\u548C\u201C\u8D1F\u8D23\u4EBA\u7535\u8BDD\u201D\u4E24\u4E2A\u5B57\u6BB5\uFF09";
    const row = document.createElement("div");
    row.className = "zgci-pop-row";
    const cancel = document.createElement("button");
    cancel.className = "zgci-cancel";
    cancel.textContent = "\u53D6\u6D88";
    cancel.onclick = closePop;
    const save = document.createElement("button");
    save.className = "zgci-save";
    save.textContent = "\u4FDD\u5B58";
    const doSave = () => {
      const v = ta.value.trim();
      if (!v) {
        ta.focus();
        return;
      }
      saveAreaPending(r, covered, v);
      closePop();
    };
    save.onclick = doSave;
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doSave();
      }
    });
    row.append(cancel, save);
    pop.append(tip, ta, row);
    const left = Math.min(cx + 12, window.innerWidth - 276);
    const top = Math.min(cy + 12, window.innerHeight - 190);
    pop.style.left = Math.max(8, left) + "px";
    pop.style.top = Math.max(8, top) + "px";
    document.body.appendChild(pop);
    ta.focus();
  }
  function saveAreaPending(r, covered, text) {
    const ann = {
      id: "AN-" + Date.now().toString(36).toUpperCase(),
      route: location.hash || location.pathname,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN"),
      text,
      label: `\u5708\u9009\u533A\u57DF\uFF08${covered.length} \u4E2A\u5143\u7D20\uFF1A${covered.slice(0, 3).map((c) => c.label.slice(0, 10)).join("\u3001")}${covered.length > 3 ? "\u2026" : ""}\uFF09`,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      kind: "area",
      covered
    };
    const list = load();
    list.push(ann);
    persist(list);
    const mark = document.createElement("div");
    mark.className = "zgci-annot-area-mark";
    mark.style.left = r.x + "px";
    mark.style.top = r.y + "px";
    mark.style.width = r.width + "px";
    mark.style.height = r.height + "px";
    const tag = document.createElement("span");
    tag.textContent = "#" + list.length + " \u5708\u9009";
    mark.appendChild(tag);
    document.body.appendChild(mark);
    updateBar();
    flash(`\u5DF2\u8BB0\u5F55\u5708\u9009 #${list.length}\uFF08\u7EE7\u7EED\u5708\uFF0C\u6216\u70B9 \u{1F3ED} \u5173\u95ED\u5708\u9009\uFF09`);
  }
  function onCapture(e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (ownUi(t)) return;
    e.preventDefault();
    e.stopPropagation();
    openPop(t, e.clientX, e.clientY);
  }
  function onKey(e) {
    if (e.key === "F9") {
      e.preventDefault();
      toggle();
      return;
    }
    if (e.key === "F10") {
      e.preventDefault();
      toggleArea();
      return;
    }
    if (e.key === "Escape" && pop) closePop();
  }
  function toggle() {
    enabled = !enabled;
    ensureBar();
    if (enabled) {
      document.body.classList.add("__zgci_annotate_mode");
      if (areaMode) bindArea();
      else bindClick();
      flash("\u6807\u6CE8\u6A21\u5F0F\u5F00\u542F\uFF1A\u70B9\u63A7\u4EF6\u5199\u610F\u89C1");
      console.log("[\u6807\u6CE8\u6A21\u5F0F] \u5F00\u542F\uFF1A\u70B9\u51FB\u63A7\u4EF6\u5199\u610F\u89C1\uFF1BF9 \u6216\u5DE5\u5177\u6761\u5173\u95ED");
    } else {
      document.body.classList.remove("__zgci_annotate_mode");
      unbindClick();
      unbindArea();
      closePop();
      clearHover();
      areaMode = false;
      console.log("[\u6807\u6CE8\u6A21\u5F0F] \u5173\u95ED");
    }
    updateBar();
    return enabled;
  }
  function bindClick() {
    window.addEventListener("click", onCapture, true);
    window.addEventListener("mouseover", onOver, true);
    window.addEventListener("mouseout", onOut, true);
  }
  function unbindClick() {
    window.removeEventListener("click", onCapture, true);
    window.removeEventListener("mouseover", onOver, true);
    window.removeEventListener("mouseout", onOut, true);
  }
  function bindArea() {
    unbindClick();
    window.addEventListener("mousedown", areaMouseDown, true);
    window.addEventListener("mousemove", areaMouseMove, true);
    window.addEventListener("mouseup", areaMouseUp, true);
  }
  function unbindArea() {
    window.removeEventListener("mousedown", areaMouseDown, true);
    window.removeEventListener("mousemove", areaMouseMove, true);
    window.removeEventListener("mouseup", areaMouseUp, true);
    removeMarquee();
    areaStart = null;
  }
  function init() {
    ensureStyle();
    ensureBar();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (enabled) toggle();
      bar?.remove();
      bar = null;
      flashEl?.remove();
      flashEl = null;
      styleEl?.remove();
      styleEl = null;
    };
  }
  function exportAll() {
    return JSON.stringify(load().filter((a) => !a.done), null, 2);
  }
  function listAll() {
    return load();
  }
  function clearAll() {
    persist([]);
    document.querySelectorAll(".zgci-annot-badge, .zgci-annot-area-mark").forEach((b) => b.remove());
    updateBar();
  }
  function markDone(ids) {
    const set = new Set(ids);
    const list = load();
    let n = 0;
    for (const a of list) {
      if (set.has(a.id) && !a.done) {
        a.done = true;
        a.doneAt = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
        n++;
      }
    }
    if (n) {
      persist(list);
      renderDoneBadges(list);
      updateBar();
    }
    return n;
  }
  function renderDoneBadges(list) {
    const pending = new Set(list.filter((a) => !a.done).map((a) => a.id));
    document.querySelectorAll(".zgci-annot-badge, .zgci-annot-area-mark > span").forEach((el) => {
      const num = el.textContent?.match(/#?(\d+)/)?.[1];
      if (!num) return;
      const idx = Number(num) - 1;
      const ann = list[idx];
      if (!ann) return;
      el.classList.toggle("zgci-annot-done", !!ann.done);
    });
    void pending;
  }
  return __toCommonJS(annotate_exports);
})();
