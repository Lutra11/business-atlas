'use strict';
/* ============================================================
 * 科研管理业务全景 — 界面引擎
 * 基于 system-atlas 工作台改造：视觉壳与 SVG 图形引擎复用原实现，
 * 页面与数据模型围绕「角色 × 功能 × 流转线」重新组织。
 * ============================================================ */

const B = window.BIZ;
const domains = B.domains, roles = B.roles, scenarios = B.scenarios, caps = B.capabilities, flows = B.flows;
const byId = new Map([...domains, ...roles, ...scenarios, ...caps, ...flows].map(n => [n.id, n]));
const roleById = id => roles.find(r => r.id === id);
const capById = id => caps.find(c => c.id === id);
const scenById = id => scenarios.find(s => s.id === id);
const domainById = id => domains.find(d => d.id === id);

const $ = s => document.querySelector(s), el = (tag, cls, text) => { let e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e },
  arr = v => Array.isArray(v) ? v : (v ? [v] : []), txt = v => typeof v === 'string' ? v : (v == null ? '' : JSON.stringify(v)), uniq = a => [...new Set(a)];
function btn(text, fn, cls = '') { const b = el('button', cls, text); b.onclick = fn; return b }
function addSection(root, title, value) { if (!value || Array.isArray(value) && !value.length) return; root.append(el('h3', '', title)); arr(value).forEach(v => root.append(el('p', '', txt(v)))) }
const roleName = id => roleById(id)?.name || id;
const scenTitle = id => scenById(id)?.title || id;
const capTitle = id => capById(id)?.title || id;
const frText = n => arr(n?.fr).filter(Boolean).join(' / ');

let mode = 'manager', page = 'overview', choice = '', selected = '', graphData = null, transform = { x: 0, y: 0, k: 1 };

const STORE_KEY = 'biz.atlas.discovery.v1'; let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { }
let scopeDomain = domains.some(d => d.id === saved.domain) ? saved.domain : '',
  recent = Array.isArray(saved.recent) ? saved.recent.filter(x => x && (byId.has(x.id))).slice(0, 8) : [],
  lastRoutes = saved.lastRoutes || {};
function saveDiscovery() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ domain: scopeDomain, recent, lastRoutes, lastRoute: location.hash })) } catch { } }

function scopedDomains() { return scopeDomain ? domains.filter(d => d.id === scopeDomain) : domains }
function scopedScenarios() { const valid = new Set(scopedDomains().flatMap(d => d.scenarioIds)); return scenarios.filter(s => valid.has(s.id)) }
function scopedCaps() { const valid = new Set(scopedScenarios().flatMap(s => s.capabilities)); return caps.filter(c => valid.has(c.id)) }
function scopedFlows() { return scopeDomain ? flows.filter(f => f.domain === scopeDomain) : flows }
function scopedRoles() { const used = new Set(scopedFlows().flatMap(f => f.steps.map(s => s.role))); return roles.filter(r => used.has(r.id)) }

const titles = {
  overview: ['业务总览', '业务总览'],
  roles: ['角色流转', '角色流转 · 功能归属'],
  scenarios: ['业务场景', '场景功能清单'],
  capabilities: ['业务能力', '能力与需求清单'],
  flows: ['执行流程', '流程与需求'],
  search: ['全局搜索', '全局搜索'],
};
function legalChoice(p, id) {
  if (p === 'scenarios') { const o = scopedScenarios(); return o.some(s => s.id === id) ? id : (o[0]?.id || '') }
  if (p === 'roles' || p === 'flows') { const o = scopedFlows(); return o.some(f => f.id === id) ? id : (o[0]?.id || '') }
  return '';
}
function rememberCurrent() {
  if (!['scenarios', 'roles', 'flows'].includes(page) || !choice) return;
  lastRoutes[page] = choice; const entry = { id: choice, page, mode, domain: scopeDomain };
  recent = [entry, ...recent.filter(x => !(x.id === choice && x.mode === mode))].slice(0, 8); saveDiscovery();
}
function restoreEntry(e) { mode = e.mode; scopeDomain = domains.some(d => d.id === e.domain) ? e.domain : ''; navigate(e.page, e.id) }
function navigate(p, id = '') {
  const valid = legalChoice(p, id); const hash = mode + '/' + p + (valid ? '/' + encodeURIComponent(valid) : '') + (scopeDomain ? '?domain=' + encodeURIComponent(scopeDomain) : '');
  if (location.hash.slice(1) === hash) { choice = valid; rememberCurrent(); render(); saveDiscovery() } else location.hash = hash;
}
function route() {
  const hash = location.hash.slice(1), [path, query] = hash.split('?'), params = new URLSearchParams(query || '');
  if (params.has('domain')) scopeDomain = domains.some(d => d.id === params.get('domain')) ? params.get('domain') : ''; else scopeDomain = '';
  const raw = path.split('/');
  if (['manager', 'product'].includes(raw[0])) mode = raw.shift();
  page = titles[raw[0]] ? raw[0] : 'overview';
  choice = legalChoice(page, decodeURIComponent(raw[1] || '')); selected = '';
  rememberCurrent(); render(); saveDiscovery();
}

function renderScope() {
  const root = $('#scopebar'); root.replaceChildren(); root.append(el('span', 'scope-caption', '业务范围'));
  const chips = el('div', 'scope-options');
  [{ id: '', title: '全部业务' }, ...domains].forEach(d => {
    const b = btn('', () => { scopeDomain = d.id; choice = legalChoice(page, choice); saveDiscovery(); navigate(page, choice) }, 'scope-chip' + (scopeDomain === d.id ? ' active' : ''));
    b.dataset.domain = d.id; b.setAttribute('aria-pressed', String(scopeDomain === d.id));
    b.append(el('span', 'chip-dot'), el('span', '', d.title));
    if (d.id) b.append(el('small', '', d.scenarioIds.length + ''));
    chips.append(b);
  }); root.append(chips);
}
function renderRecent() {
  const root = $('#recent-nav'); root.replaceChildren(); root.append(el('div', 'nav-section-label', '最近查看'));
  recent.slice(0, 3).forEach(e => { const t = byId.get(e.id)?.title || ''; const b = btn(t, () => restoreEntry(e), 'recent-item'); b.title = t; root.append(b) });
  if (!recent.length) root.append(el('div', 'recent-empty', '查看的场景和流程会保存在这里'));
}

/* ---------------- 详情面板 ---------------- */
function rel(root, id, detail = '') {
  const b = btn(byId.get(id)?.title || roleName(id), () => inspect(id), 'relation');
  if (detail) b.append(el('small', '', detail)); root.append(b);
}
/* 字段清单公共渲染：frs = 需求编号数组（支持复合编号如 'FR-08/09/12/14/15' 与 QFR- 前缀），
   逐 FR 定位 PRD 字段表并按「字段名左/类型·必填/说明右」渲染；PRD 无字段清单的以 fallback 文案兜底 */
function renderFieldSpec(root, frs, fallback, secTitle = '字段清单') {
  const expand = v => { /* 'FR-08/09/12/14/15' → ['FR-08','FR-09',…]; QFR-N → D_qt FR-N */
    const m = /^QFR-(\d+)$/.exec(v); if (m) return ['QFR-' + m[1]];
    const mm = /^FR-(\d+(?:\/\d+)*)$/.exec(v); if (mm) return mm[1].split('/').map(x => 'FR-' + x);
    return [v];
  };
  const dom = frs.some(f => /^QFR/.test(f)) ? 'D_qt' : 'D_lx';
  const tbls = [];
  frs.flatMap(expand).forEach(fr => {
    const key = fr.replace('QFR-', 'FR-');
    (((window.PRD_FIELDS || {})[dom] || {})[key] || []).forEach(t => tbls.push(t));
  });
  if (!tbls.length) { if (fallback) { root.append(el('h3', '', secTitle)); root.append(el('p', 'field-empty', fallback)) } return; }
  const colOf = (hdr, keys) => (hdr || []).findIndex(h => keys.some(k => (h || '').replace(/\//g, '').replace(/\s/g, '').includes(k)));
  root.append(el('h3', '', secTitle));
  const grid = el('div', 'field-grid');
  const head = el('div', 'field-head');
  head.append(el('span', 'fh-name', '字段名称'));
  head.append(el('span', 'fh-type', '字段类型'));
  head.append(el('span', 'fh-desc', '字段说明'));
  grid.append(head);
  tbls.forEach(t => {
    if (!t.rows.length) return;
    const hdr = (t.header || []).map(h => (h || '').trim());
    const hasHdr = hdr.some(Boolean);
    const iType = hasHdr ? colOf(hdr, ['类型', '题型', '约束']) : (t.rows[0] || []).length > 2 ? 1 : -1;
    const iReq = hasHdr ? colOf(hdr, ['必填']) : -1;
    const iDesc = hasHdr ? colOf(hdr, ['说明', '描述', '人机交互', '内容与口径', '档位与区间', '达成方式', '判定数据来源', '配置参数', '题干', '界面预置细化标准']) : (t.rows[0] || []).length > 2 ? 2 : 1;
    const iGroup = hasHdr ? colOf(hdr, ['子页签', '区块', '题号']) : -1;
    const iName = hasHdr ? Math.max(colOf(hdr, ['字段名', '列名', '字段', '要素', '条件项', '项目']), 0) : 0;
    t.rows.forEach(row => {
      const group = iGroup >= 0 ? (row[iGroup] || '').trim() : '';
      const name = (row[iName] || '').trim(); if (!name) return;
      const tv = iType >= 0 ? (row[iType] || '').trim() : '';
      const r = iReq >= 0 ? (row[iReq] || '').trim() : '';
      let type = tv && tv !== '—' ? tv : '';
      if (!type && r === '是') type = '必填';
      else if (type && r === '是') type = type + '（必填）';
      else if (type && r === '否') type = type + '（选填）';
      const dv = iDesc >= 0 ? (row[iDesc] || '').trim() : '';
      const desc = dv && dv !== '—' ? dv : '';
      const g = group && group !== name ? group : '';
      const line = el('div', 'field-line');
      line.append(el('span', 'field-name', name));
      line.append(el('span', 'field-type', type || '—'));
      line.append(el('span', 'field-desc', (desc || (g ? g : '—')) + (g && desc ? `（${g}）` : '')));
      grid.append(line);
    });
  });
  root.append(grid);
}
function inspect(id, custom) {
  selected = id; const n = custom || byId.get(id); if (!n) return;
  const root = $('#inspector'); root.replaceChildren();
  const step = custom && custom.__kind === 'step', outcome = custom && custom.__kind === 'outcome';
  const kindName = { role: '角色', scenario: '业务场景', capability: '业务能力', flow: '流程主线', domain: '业务领域' };
  root.append(
    el('div', 'eyebrow', mode === 'product' && !step && !outcome ? '需求对象' : (step ? '角色流转节点' : outcome ? '业务产出' : (kindName[n.id && roles.some(r => r.id === n.id) ? 'role' : n.id && scenarios.some(s => s.id === n.id) ? 'scenario' : n.id && caps.some(c => c.id === n.id) ? 'capability' : n.id && flows.some(f => f.id === n.id) ? 'flow' : 'domain'] || '业务对象'))),
    el('h2', '', n.title || n.name || ''),
    el('p', '', n.summary || (n.duties ? n.duties.join('；') : '') || (step ? n.action : '') || (outcome ? '该场景的交付结果。' : ''))
  );
  arr(n.fr).forEach(x => root.append(el('span', 'smalltag', x)));
  if (n.tab) root.append(el('span', 'smalltag', n.tab));
  if (n.status) root.append(el('span', 'smalltag', n.status));
  if (step) {
    addSection(root, '流转动作', n.action);
    root.append(el('h3', '', '负责角色')); rel(root, n.role);
    if (mode === 'product') { addSection(root, '需求编号', arr(n.fr).length ? arr(n.fr) : '待对应'); }
    /* 字段清单：该流转环节对应需求的 PRD 字段表 */
    renderFieldSpec(root, arr(n.fr), '该环节对应需求（' + (arr(n.fr).join('、') || '—') + '）在 PRD 中无独立字段清单小节，字段以界面原型为准。');
    const f = flows.find(x => x.id === n.flow);
    if (f) { root.append(el('h3', '', '所属主线')); rel(root, f.id) }
    const outs = f ? f.edges.filter(e => e.from === n.id) : [], ins = f ? f.edges.filter(e => e.to === n.id) : [];
    const stTitle = id => f?.steps.find(x => x.id === id)?.title || id;
    if (outs.length) { root.append(el('h3', '', '出口流转')); outs.forEach(e => root.append(el('p', '', stTitle(e.to) + ' — ' + e.label + (e.kind === 'return' ? '（退回/催办）' : e.kind === 'auto' ? '（系统自动）' : '')))) }
    if (ins.length) { root.append(el('h3', '', '入口流转')); ins.forEach(e => root.append(el('p', '', stTitle(e.from) + ' → 本节点 · ' + e.label))) }
  }
  if (roles.some(r => r.id === n.id) && !step && !outcome) {
    addSection(root, '所在部门', n.org);
    addSection(root, '主要职责', n.duties);
    const mine = caps.filter(c => c.role === n.id);
    if (mine.length) { root.append(el('h3', '', '承担功能')); mine.forEach(c => rel(root, c.id, frText(c) || roleName(c.role))) }
    const fs = flows.filter(f => f.steps.some(s => s.role === n.id));
    if (fs.length) { root.append(el('h3', '', '参与主线')); fs.forEach(f => rel(root, f.id)) }
  }
  if (scenarios.some(s => s.id === n.id) && !step && !outcome) {
    addSection(root, '服务对象', n.audience); addSection(root, '业务产出', n.outcome);
    root.append(el('h3', '', '所需能力')); arr(n.capabilities).forEach(c => rel(root, c, frText(capById(c)) || ''));
    /* 字段清单：场景所需能力对应需求的 PRD 字段表（复合 FR 编号自动展开逐个列出） */
    renderFieldSpec(root, uniq(arr(n.capabilities).flatMap(c => arr(capById(c)?.fr))), '该场景对应需求在 PRD 中无独立字段清单小节，字段以界面原型为准。');
    const d = domainById(n.domain); if (d) { root.append(el('h3', '', '所属领域')); rel(root, d.id) }
  }
  if (caps.some(c => c.id === n.id) && !step && !outcome) {
    root.append(el('h3', '', '负责角色')); rel(root, n.role);
    /* 字段说明：按 PRD 字段清单（scripts/prd_fields.json）逐表逐字段列出；PRD 无字段清单的需求以业务摘要兜底 */
    renderFieldSpec(root, arr(n.fr), n.summary, '字段说明');
    root.append(el('h3', '', '服务场景')); arr(n.scenarios).forEach(s => rel(root, s));
    if (mode === 'product') {
      addSection(root, '需求编号', arr(n.fr).length ? arr(n.fr) : '待对应（在 data.js 的 fr 字段补充）');
      addSection(root, '优先级', n.priority || '待排期'); addSection(root, '交付状态', n.status || '—');
    }
  }
  if (flows.some(f => f.id === n.id) && !step && !outcome) {
    addSection(root, '流程概览', n.note);
    root.append(el('h3', '', '流程步骤')); n.steps.forEach(s => root.append(el('p', '', roleName(s.role) + ' · ' + s.title + (frText(s) ? '（' + frText(s) + '）' : ''))));
    const d = domainById(n.domain); if (d) { root.append(el('h3', '', '所属领域')); rel(root, d.id) }
  }
  if (domains.some(d => d.id === n.id) && !step && !outcome) {
    addSection(root, '领域说明', n.summary); addSection(root, '交付结果', n.outcome);
    root.append(el('h3', '', '工作场景')); arr(n.scenarioIds).forEach(s => rel(root, s));
    const fs = flows.filter(f => f.domain === n.id);
    if (fs.length) { root.append(el('h3', '', '流程主线')); fs.forEach(f => rel(root, f.id)) }
  }
  $('#content').classList.remove('closed'); if (innerWidth < 901) $('#content').classList.add('inspector-open');
  highlight();
}

/* ===== 以下为复用原型的 SVG 图形引擎（drawGraph / 缩放平移 / 联动高亮） ===== */
const NS='http://www.w3.org/2000/svg';function svg(tag,attrs={}){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}function wrapText(s,max){const lines=[];let line='',len=0;for(const ch of String(s||'')){let w=/[\x00-\xff]/.test(ch)?.55:1;if(len+w>max){lines.push(line);line='';len=0}line+=ch;len+=w}if(line)lines.push(line);return lines}
function drawGraph(nodes,edges,columns){graphData={nodes,edges};const body=$('#canvas'),wrap=el('div','graph-wrap'),s=svg('svg',{class:'graph',role:'group','aria-label':'可平移缩放的关系图'}),g=svg('g'),positions=new Map(),groups=new Map();nodes.forEach(n=>{if(!groups.has(n.col))groups.set(n.col,[]);groups.get(n.col).push(n)});const maxCol=Math.max(...nodes.map(n=>n.col),0),W=maxCol>=4?182:220,G=maxCol>=4?46:70,H=112;let height=0;for(let c=0;c<=maxCol;c++){const list=groups.get(c)||[];list.forEach((n,i)=>{const y=60+i*(H+30);positions.set(n.id,{x:30+c*(W+G),y,w:W,h:H});height=Math.max(height,y+H+35)});const title=svg('text',{x:30+c*(W+G),y:27,class:'column-label'});title.textContent=columns[c]||`步骤 ${c+1}`;g.append(title)}const defs=svg('defs'),marker=svg('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#171717'}));defs.append(marker);s.append(defs);const edgeLabels=[];edges.forEach(e=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return;let forward=b.x>a.x;let x1=forward?a.x+a.w:a.x,y1=a.y+a.h/2,x2=forward?b.x:b.x+b.w,y2=b.y+b.h/2,d;const chan=a.x+a.w+G/2;if(a.x===b.x){const vy=a===b?y1+34:y2;d=`M ${a.x+a.w} ${y1} H ${chan} V ${vy} H ${b.x+b.w}`}else{d=`M ${x1} ${y1} H ${(x1+x2)/2} V ${y2} H ${x2}`}const path=svg('path',{d,class:'graph-edge '+(e.type||''),'marker-end':e.type==='related'?'none':'url(#arrow)','data-from':e.from,'data-to':e.to});const title=svg('title');title.textContent=e.label||(e.type==='write'?'写入':e.type==='read'?'读取':e.type==='related'?'关联，方向未确认':'业务关系');path.append(title);g.append(path);if(e.label){const ew=[...e.label].reduce((s,ch)=>s+(/[ -ÿ]/.test(ch)?7:12.5),0);const rects=[...positions.values()];const placed=edgeLabels;const hit=(cx,cy)=>rects.some(p=>cx-ew/2<p.x+p.w&&cx+ew/2>p.x&&cy-7<p.y+p.h&&cy+7>p.y)||placed.some(q=>cx-ew/2-3<q.x+q.w&&cx+ew/2+3>q.x&&cy-11<q.y+q.h&&cy+11>q.y);let lx,ly;if(a.x===b.x&&a===b){const cands=[[chan,y1+20],[chan,y1+66],[chan,a.y-17],[chan,a.y+a.h+17]];const ok=cands.find(c=>!hit(c[0],c[1]));lx=ok?ok[0]:chan;ly=ok?ok[1]:y1+20}else if(a.x===b.x){const cands=[[chan,(y1+y2)/2+4],[chan,(y1+y2)/2-20],[chan,(y1+y2)/2-44],[chan,a.y-17],[chan,a.y+a.h+17]];const ok=cands.find(c=>!hit(c[0],c[1]));lx=ok?ok[0]:chan;ly=ok?ok[1]:(y1+y2)/2+4}else{const mid=(x1+x2)/2;const cands=[[mid,y1-8],[x1+ew/2+12,y1-8],[x2-ew/2-12,y1-8],[mid,y1-30],[mid,y1-52],[mid,a.y-17],[mid,b.y+b.h+17],[mid,(y1+y2)/2]];const ok=cands.find(c=>!hit(c[0],c[1])&&c[0]-ew/2>=15&&c[0]+ew/2<=(maxCol+1)*(W+G));lx=ok?ok[0]:mid;ly=ok?ok[1]:y1-8}const lt=svg('text',{x:lx,y:ly,class:'edge-label','text-anchor':'middle'});lt.textContent=e.label;g.append(lt);placed.push({x:lx-ew/2,y:ly-7,w:ew,h:14})}});nodes.forEach(n=>{const p=positions.get(n.id),node=svg('g',{class:'graph-node '+(n.kind||''),transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','aria-label':n.title,'data-id':n.id,'data-node-id':n.baseId||n.id,'data-role':n.role||''});node.append(svg('rect',{width:W,height:H,rx:6}),svg('rect',{x:0,y:17,width:3,height:H-34,rx:1,class:'accentbar'}));const lines=wrapText(n.title,n.kind==='data'?10.5:11.5).slice(0,3);lines.forEach((line,i)=>{let t=svg('text',{x:15,y:26+i*20,class:'node-title'});t.textContent=line;node.append(t)});const sub=wrapText(n.sub,15)[0]||'';let meta=svg('text',{x:15,y:H-13,class:'node-meta'});meta.textContent=sub.length<txt(n.sub).length?sub+'…':sub;node.append(meta);const tt=svg('title');tt.textContent=n.title+'\n'+(n.sub||'');node.append(tt);node.onclick=()=>inspect(n.baseId||n.id,n.custom);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(n.baseId||n.id,n.custom)}};g.append(node)});s.append(g);wrap.append(s);const tools=el('div','graph-tools');tools.append(btn('−',()=>zoom(.8),'zoom-out'),btn('+',()=>zoom(1.25),'zoom-in'),btn('适配',()=>fit(),'zoom-fit'),btn('100%',()=>{transform.k=1;apply()},'zoom-reset'));wrap.append(tools);body.append(wrap);if(body.children.length>1)wrap.style.height='calc(100% - 60px)';const totalW=(maxCol+1)*(W+G)+10;function apply(){g.setAttribute('transform',`translate(${transform.x},${transform.y}) scale(${transform.k})`)}function fit(){const r=wrap.getBoundingClientRect();transform={k:Math.min(1,Math.max(.5,Math.min((r.width-35)/totalW,(r.height-60)/height))),x:Math.max(15,(r.width-totalW*Math.min(1,Math.max(.5,Math.min((r.width-35)/totalW,(r.height-60)/height))))/2),y:Math.max(15,(r.height-height*Math.min(1,Math.max(.5,Math.min((r.width-35)/totalW,(r.height-60)/height))))/2)};apply()}function zoom(f){const r=wrap.getBoundingClientRect(),k=Math.min(2,Math.max(.25,transform.k*f));transform.x=r.width/2-(r.width/2-transform.x)*k/transform.k;transform.y=r.height/2-(r.height/2-transform.y)*k/transform.k;transform.k=k;apply()}let dragging=null;s.onpointerdown=e=>{if(e.target.closest('.graph-node'))return;dragging={x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};s.setPointerCapture(e.pointerId)};s.onpointermove=e=>{if(dragging){transform.x=dragging.tx+e.clientX-dragging.x;transform.y=dragging.ty+e.clientY-dragging.y;apply()}};s.onpointerup=()=>dragging=null;s.onpointercancel=()=>dragging=null;s.onwheel=e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(e.deltaY>0?.9:1.1);else{transform.x-=e.deltaX;transform.y-=e.deltaY;apply()}};requestAnimationFrame(()=>{s.querySelectorAll('.graph-node').forEach(node=>{const full=node.getAttribute('aria-label')||'',limit=Number(node.querySelector('rect').getAttribute('width'))-30;node.querySelectorAll('.node-title').forEach(t=>t.remove());const probe=svg('text',{x:15,y:26,class:'node-title'});node.append(probe);const lines=[];let line='';for(const ch of full){probe.textContent=line+ch;if(line&&probe.getComputedTextLength()>limit){lines.push(line);line=ch}else line+=ch}if(line)lines.push(line);probe.remove();lines.slice(0,3).forEach((value,i)=>{const t=svg('text',{x:15,y:26+i*20,class:'node-title'});t.textContent=value;node.append(t);if(i===2&&lines.length>3){t.textContent=value+'…';while(t.getComputedTextLength()>limit&&value.length){value=value.slice(0,-1);t.textContent=value+'…'}}});});fit();});highlight();}
function highlight(){if(graphData){const selectedIds=new Set(graphData.nodes.filter(n=>n.id===selected||n.baseId===selected).map(n=>n.id)),connected=new Set(selectedIds);graphData.edges.forEach(e=>{if(selectedIds.has(e.from))connected.add(e.to);if(selectedIds.has(e.to))connected.add(e.from)});document.querySelectorAll('.graph-node').forEach(e=>{e.classList.toggle('selected',selectedIds.has(e.dataset.id));e.classList.toggle('dim',selectedIds.size>0&&!connected.has(e.dataset.id))});document.querySelectorAll('.graph-edge').forEach(e=>{const hot=selectedIds.has(e.dataset.from)||selectedIds.has(e.dataset.to);e.classList.toggle('hot',hot);e.classList.toggle('dim',selectedIds.size>0&&!hot)})}document.querySelectorAll('[data-row]').forEach(e=>e.classList.toggle('selected-row',e.dataset.row===selected))}


/* ---------------- 页面渲染 ---------------- */
const ROLE_COLORS = { R_pi: '#5260d8', R_sub: '#148b96', R_mgb: '#b7791f', R_exp: '#c2586e', R_pmo: '#7a4fc9' };
const EDGE_TYPE = { main: '', auto: 'write', return: 'flowback' };

function selectControl(items, value, onchange, aria) {
  const s = el('select'); s.setAttribute('aria-label', aria || '选择对象');
  items.forEach(it => { const o = el('option', '', it.title); o.value = it.id; if (it.id === value) o.selected = true; s.append(o) });
  s.onchange = () => onchange(s.value); return s;
}
function stepEdges(f) { return f.edges.map(e => ({ from: e.from, to: e.to, label: e.label, type: EDGE_TYPE[e.kind] ?? '' })) }

let carouselIndex = 0; /* 业务角色轮播当前位置（页面切换后保持） */
window.addEventListener('keydown', e => { /* 总览页键盘 ←/→ 切换角色轮播 */
  if (!document.querySelector('#canvas .carousel-track')) return;
  const n = scopedRoles().length; if (!n) return;
  if (e.key === 'ArrowLeft') { carouselIndex = (Math.min(carouselIndex, n - 1) - 1 + n) % n; render() }
  else if (e.key === 'ArrowRight') { carouselIndex = (Math.min(carouselIndex, n - 1) + 1) % n; render() }
});

function renderOverview() {
  const bar = $('#toolbar'), body = $('#canvas');
  bar.append(el('label', '', '业务角色总览'), el('span', 'tool-note', `${domains.length} 个领域 · ${roles.length} 个角色 · ${flows.length} 条主线`));
  const p = el('div', 'portfolio');
  /* 业务角色轮播：左右切换卡片（不做上下滚动） */
  const roleList = scopedRoles();
  const idx = Math.min(carouselIndex, Math.max(0, roleList.length - 1));
  const cwrap = el('div', 'role-carousel');
  const ctitle = el('div', 'carousel-title'); ctitle.append(el('span', 'carousel-eyebrow', '业务角色'), el('h2', '', '角色职责总览'), el('span', 'carousel-count', roleList.length ? `${idx + 1} / ${roleList.length}` : ''));
  cwrap.append(ctitle);
  /* 左右切换按钮置于卡片两侧；卡片内为「列名左·内容右」清单（不显示编号） */
  const view = el('div', 'carousel-view');
  const prevB = btn('‹', () => stepCarousel(-1), 'carousel-btn'); prevB.setAttribute('aria-label', '上一个角色');
  const nextB = btn('›', () => stepCarousel(1), 'carousel-btn'); nextB.setAttribute('aria-label', '下一个角色');
  const track = el('div', 'carousel-track');
  roleList.forEach((r, i) => {
    const slide = el('div', 'carousel-slide' + (i === idx ? ' active' : ''));
    const mkRow = (label, value) => { const rw = el('div', 'role-row'); rw.append(el('div', 'role-label', label), value); slide.append(rw) };
    const nameVal = el('div', 'role-value'); nameVal.append(btn(r.name, () => inspect(r.id), 'domain-title'));
    mkRow('角色名称', nameVal);
    mkRow('所属单位', el('div', 'role-value', r.org + (r.tabs ? ' · ' + r.tabs.join(' / ') : '')));
    const duty = el('div', 'role-value carousel-duty'); r.duties.forEach(d => duty.append(el('p', 'duty-line', d)));
    mkRow('主要职责', duty);
    const sc = el('div', 'role-value carousel-scenes');
    uniq(caps.filter(c => c.role === r.id).flatMap(c => c.scenarios)).filter(id => scopedScenarios().some(s => s.id === id))
      .forEach(id => sc.append(btn(scenTitle(id) + '  →', () => navigate('scenarios', id), 'scenario-item')));
    if (!sc.children.length) sc.append(el('p', 'domain-summary', '在当前业务范围下暂无参与场景。'));
    mkRow('参与场景', sc);
    track.append(slide);
  });
  view.append(prevB, track, nextB);
  const dots = el('div', 'carousel-dots');
  roleList.forEach((r, i) => { const d = btn('', () => { carouselIndex = i; render() }, 'carousel-dot' + (i === idx ? ' active' : '')); d.setAttribute('aria-label', `角色 ${i + 1}`); dots.append(d) });
  if (!roleList.length) track.append(el('div', 'empty-state', '当前业务范围暂无角色。'));
  p.append(cwrap, view, dots);
  function stepCarousel(dir) { const n = roleList.length; if (!n) return; carouselIndex = (idx + dir + n) % n; render() }
  requestAnimationFrame(() => { /* 切换后自动滚到 active 卡片，避免横滑错位 */
    const act = track.querySelector('.carousel-slide.active'); if (act) act.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
  body.append(p);
}

/* 角色流转：核心页 — 列 = 角色（泳道），节点 = 该角色在主线中的功能，边 = 流转线 */
function renderRoles() {
  const bar = $('#toolbar'), body = $('#canvas');
  const list = scopedFlows(); const id = list.some(f => f.id === choice) ? choice : (list[0]?.id || '');
  bar.append(el('label', '', '业务主线'), selectControl(list.map(f => ({ id: f.id, title: f.title })), id, v => navigate('roles', v), '选择业务主线'),
    el('span', 'tool-note', '列 = 角色泳道 · 卡片左侧色条标识角色 · 虚线为退回 / 催办'));
  const f = byId.get(id);
  if (!f) { body.append(el('div', 'empty-state', '当前业务范围暂无流程主线，请在 data.js 的 flows 中补充。')); return }
  if (f.note) body.append(el('div', 'introline', f.note));
  const order = f.roleOrder?.length ? f.roleOrder : uniq(f.steps.map(s => s.role));
  const colOf = new Map(order.map((r, i) => [r, i]));
  const groups = new Map(); f.steps.forEach(s => { if (!groups.has(s.role)) groups.set(s.role, []); groups.get(s.role).push(s) });
  const nodes = [];
  groups.forEach((steps, rid) => steps.forEach(s => nodes.push({
    id: s.id, title: s.title, col: colOf.get(rid), role: s.role,
    sub: mode === 'product' ? (frText(s) || '待对应 FR') : roleName(s.role),
    custom: { ...s, __kind: 'step', flow: f.id },
  })));
  drawGraph(nodes, stepEdges(f), order.map(r => roleName(r)));
}

function renderScen() {
  const bar = $('#toolbar'), body = $('#canvas');
  const list = scopedScenarios(); const id = list.some(s => s.id === choice) ? choice : (list[0]?.id || '');
  bar.append(el('label', '', '工作场景'), selectControl(list.map(s => ({ id: s.id, title: s.title })), id, v => navigate('scenarios', v), '选择工作场景'));
  const s = byId.get(id); if (!s) { body.append(el('div', 'empty-state', '暂无场景。')); return }
  body.append(el('div', 'introline', `${s.audience || ''}  /  ${s.outcome || ''}`));
  const cs = arr(s.capabilities);
  const nodes = [
    { id: s.id, title: s.title, sub: '工作目标', col: 0 },
    ...cs.map(c => { const n = capById(c); return { id: c, title: n.title, col: 1, role: n.role, sub: mode === 'product' ? (frText(n) || '待对应 FR') : (n.tab ? n.tab + ' · ' + roleName(n.role) : roleName(n.role)) } }),
    { id: 'out:' + s.id, title: s.outcome || '业务成果', sub: '业务产出', col: 2, custom: { __kind: 'outcome', id: 'out:' + s.id, title: s.outcome, summary: '该场景的交付结果；边界与产出说明可在 data.js 中补充。' } },
  ];
  drawGraph(nodes, [...cs.map(c => ({ from: s.id, to: c })), ...cs.map(c => ({ from: c, to: 'out:' + s.id }))], ['工作目标', '所需业务能力', '交付结果']);
}

function renderCaps() {
  const bar = $('#toolbar'), body = $('#canvas');
  if (mode === 'product') {
    bar.append(el('label', '', '能力与需求清单'), el('span', 'tool-note', 'FR 编号 / 优先级 / 交付状态 · 在 data.js 中维护'));
    const t = el('table', 'matrix'), thead = el('thead'), h = el('tr');
    ['业务能力', '负责角色', '需求编号', '优先级', '交付状态'].forEach(x => h.append(el('th', '', x))); thead.append(h); t.append(thead);
    scopedCaps().forEach(c => {
      const tr = el('tr'); tr.dataset.row = c.id;
      const t0 = el('td'); t0.append(btn(c.title, () => inspect(c.id), 'celltitle'), el('div', 'sub', c.summary)); tr.append(t0);
      const t1 = el('td'); t1.append(el('span', 'celltitle', roleName(c.role))); tr.append(t1);
      const t2 = el('td'); if (arr(c.fr).length) arr(c.fr).forEach(x => t2.append(el('span', 'smalltag', x))); else t2.append(el('span', 'sub', '待对应')); tr.append(t2);
      const t3 = el('td'); t3.append(el('span', c.priority ? 'celltitle' : 'sub', c.priority || '待排期')); tr.append(t3);
      const t4 = el('td'); t4.append(el('span', c.status ? 'celltitle' : 'sub', c.status || '—')); tr.append(t4);
      t.append(tr);
    });
    body.append(t); return;
  }
  bar.append(el('label', '', '能力复用矩阵'), el('span', 'tool-note', '列为业务领域，点击圆点查看关联场景'));
  const t = el('table', 'matrix'), thead = el('thead'), h = el('tr');
  ['业务能力', ...domains.map(d => d.title)].forEach(x => h.append(el('th', '', x))); thead.append(h); t.append(thead);
  scopedCaps().forEach(c => {
    const tr = el('tr'); tr.dataset.row = c.id;
    const td = el('td'); td.append(btn(c.title, () => inspect(c.id), 'celltitle'), el('div', 'sub', roleName(c.role))); tr.append(td);
    scopedDomains().forEach(d => {
      const tdd = el('td'); const ss = arr(c.scenarios).filter(x => d.scenarioIds.includes(x));
      tdd.append(btn(ss.length ? '●' : '—', () => ss.length && navigate('scenarios', ss[0]), 'scenario-dot' + (ss.length ? '' : ' empty')));
      tr.append(tdd);
    });
    t.append(tr);
  });
  body.append(t);
}

/* 执行流程：列 = 流转步骤序，节点标注角色 / FR */
function renderFlowSeq() {
  const bar = $('#toolbar'), body = $('#canvas');
  const list = scopedFlows(); const id = list.some(f => f.id === choice) ? choice : (list[0]?.id || '');
  bar.append(el('label', '', '执行流程'), selectControl(list.map(f => ({ id: f.id, title: f.title })), id, v => navigate('flows', v), '选择执行流程'),
    el('span', 'tool-note', '列 = 步骤序 · 虚线为退回 / 催办'));
  const f = byId.get(id);
  if (!f) { body.append(el('div', 'empty-state', '当前业务范围暂无流程主线。')); return }
  if (f.note) body.append(el('div', 'introline', f.note));
  const levels = new Map(f.steps.map(s => [s.id, 0]));
  const fwd = f.edges.filter(e => e.kind !== 'return');
  for (let i = 0; i < f.steps.length; i++) fwd.forEach(e => levels.set(e.to, Math.min(f.steps.length, Math.max(levels.get(e.to) || 0, (levels.get(e.from) || 0) + 1))));
  const nodes = f.steps.map(s => ({
    id: s.id, title: s.title, col: levels.get(s.id), role: s.role,
    sub: mode === 'product' ? (frText(s) || '待对应 FR') : roleName(s.role),
    custom: { ...s, __kind: 'step', flow: f.id },
  }));
  drawGraph(nodes, stepEdges(f), []);
}

function renderSearch() {
  const bar = $('#toolbar'), body = $('#canvas');
  const all = [
    ...domains.map(o => ({ o, kind: '业务领域' })), ...roles.map(o => ({ o, kind: '角色' })),
    ...scenarios.map(o => ({ o, kind: '业务场景' })), ...caps.map(o => ({ o, kind: '业务能力' })),
    ...flows.map(o => ({ o, kind: '流程主线' })),
  ];
  bar.append(el('label', '', '全部对象'), el('span', 'tool-note', all.length + ' 个对象 · 领域、角色、场景、能力与流程'));
  const box = el('div', 'searchbox'), input = el('input');
  input.placeholder = '搜索业务名称、角色、场景或流程…'; input.setAttribute('aria-label', '搜索全部对象');
  box.append(input); body.append(box);
  const results = el('div'); body.append(results);
  function update() {
    const q = input.value.trim().toLowerCase(); results.replaceChildren();
    const matches = all.filter(x => !q || ((x.o.title || x.o.name || '') + (x.o.summary || '') + (x.o.org || '') + (x.o.duties || []).join('') + (x.o.note || '') + (x.o.id || '')).toLowerCase().includes(q));
    results.append(el('div', 'introline', `找到 ${matches.length} 个对象`));
    matches.forEach(x => {
      const b = btn('', () => inspect(x.o.id), 'search-result');
      const desc = x.kind === '角色' ? (x.o.org + ' · ' + (x.o.duties || []).join('；')) : (x.o.summary || x.o.note || '');
      b.append(el('strong', '', x.o.title || x.o.name), el('small', '', x.kind + ' · ' + desc.slice(0, 110)));
      results.append(b);
    });
  }
  input.oninput = update; update(); requestAnimationFrame(() => input.focus());
}

/* ---------------- 总渲染与路由 ---------------- */
function render() {
  graphData = null; $('#canvas').replaceChildren(); $('#toolbar').replaceChildren(); $('#footer').replaceChildren();
  $('#manager').classList.toggle('active', mode === 'manager'); $('#product').classList.toggle('active', mode === 'product');
  document.querySelectorAll('.navlink').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
  $('#title').textContent = titles[page][mode === 'product' ? 1 : 0];
  $('#crumb').textContent = titles[page][0];
  $('#headcount').textContent = `${scopedScenarios().length} 个场景 · ${scopedCaps().length} 项能力 · ${scopedRoles().length} 个角色 · ${scopedFlows().length} 条主线`;
  renderScope(); renderRecent();
  $('#subtitle').textContent = mode === 'product' ? '按需求编号（FR）核对功能归属、优先级与交付状态。' : '从业务领域与角色出发，查看场景、能力与角色间的功能流转。';
  if (page === 'search') renderSearch();
  else if (page === 'overview') renderOverview();
  else if (page === 'roles') renderRoles();
  else if (page === 'scenarios') renderScen();
  else if (page === 'capabilities') renderCaps();
  else renderFlowSeq();
  const f = $('#footer');
  if (graphData) {
    [['', '主流转'], ['cyan', '系统自动'], ['dashed', '退回 · 催办']].forEach(([c, t]) => { const l = el('span', 'legend'); l.append(el('i', c), document.createTextNode(t)); f.append(l) });
    f.append(el('span', '', '拖动画布平移 · 点击节点查看详情'));
  } else f.append(el('span', '', mode === 'product' ? '点击能力或流程节点，核对需求编号与状态。' : '点击角色、场景或能力，在右侧查看业务详情。'));
  if (!selected) {
    if (choice && byId.has(choice)) inspect(choice);
    else if (page === 'roles' || page === 'flows') { const f0 = scopedFlows()[0]; if (f0) inspect(f0.id) }
    else if (page === 'scenarios') { const s0 = scopedScenarios()[0]; if (s0) inspect(s0.id) }
    else if (page === 'capabilities') { const c0 = scopedCaps()[0]; if (c0) inspect(c0.id) }
    else { const d0 = scopedDomains()[0]; if (d0) { inspect(d0.id); selected = ''; highlight() } }
  } else if (byId.has(selected)) inspect(selected);
  if (innerWidth < 901) $('#content').classList.remove('inspector-open');
}

document.querySelectorAll('.navlink').forEach(a => a.onclick = e => { e.preventDefault(); navigate(a.dataset.nav, lastRoutes[a.dataset.nav] || '') });
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; selected = ''; navigate(page, choice) });
$('#search-open').onclick = () => navigate('search');
$('#toggle-inspector').onclick = () => { if (innerWidth < 901) $('#content').classList.toggle('inspector-open'); else $('#content').classList.toggle('closed') };
$('#close-inspector').onclick = () => { $('#content').classList.remove('inspector-open'); $('#content').classList.add('closed') };
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('#content').classList.remove('inspector-open'); if (innerWidth < 901) $('#content').classList.add('closed') }
  if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); navigate('search') }
});
if (!location.hash && saved.lastRoute) history.replaceState(null, '', saved.lastRoute);
route();
