#!/usr/bin/env python
# 从两份 PRD 提取每 FR 的字段清单 -> scripts/prd_fields.json
# 结构: {D_lx: {FR-01: [{title, header, rows:[...]}...]}, D_qt: {...}}
import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:/Users/Admin/Desktop/业务流程'
FILES = {'D_lx': BASE + r'/科研项目管理PRD.md', 'D_qt': BASE + r'/季度推进会PRD.md'}

TBL = re.compile(r'^表[\s\xa0]*\d+[（(]?[a-z]?[）)]?(?:[（(][a-z][）)])?\s*(.*)$')
SEP = re.compile(r'^\|[\s\-:|]+\|$')
FRH = re.compile(r'^###\s+3\.\d+\s+FR-(\d+)')

def clean(s):
    return re.sub(r'\*\*|\s*<br>\s*', ' / ', s).replace('\xa0', ' ').strip()

def parse(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    out, cur_fr, cur_tbl, hdr, rows, in_cl = {}, None, None, None, [], False
    def flush():
        nonlocal cur_tbl, hdr, rows
        if cur_fr and cur_tbl is not None and rows:
            out.setdefault(cur_fr, []).append({'title': cur_tbl, 'header': hdr or [], 'rows': rows})
        cur_tbl, hdr, rows = None, None, []
    for line in lines:
        s = line.strip()
        m = FRH.match(s)
        if m:
            flush(); cur_fr = 'FR-' + m.group(1).zfill(2); in_cl = False; continue
        if re.match(r'^####\s+3\.\d+\.2\s+字段清单', s):
            flush(); in_cl = True; continue
        if re.match(r'^####\s+', s) and in_cl:  # 离开字段清单小节
            flush(); in_cl = False; continue
        if not in_cl:
            continue
        tm = TBL.match(s)
        if tm and not s.startswith('|'):
            flush(); cur_tbl = clean(tm.group(0)); in_cl = True
            # 表标题内含'测试用例'则整表跳过: 标记
            if '测试用例' in cur_tbl: cur_tbl = None
            continue
        if s.startswith('|'):
            cells = [clean(c) for c in s.strip('|').split('|')]
            if SEP.match(s):
                continue
            if cells and any(k in ''.join(cells) for k in ('字段名', '列名', '要素', '字段')):
                if not rows:  # 表头
                    hdr = cells
                continue
            if cur_tbl is not None and cells and any(cells):
                rows.append(cells)
    flush()
    return out

result = {}
for dom, path in FILES.items():
    result[dom] = parse(path)
    total = sum(len(v) for v in result[dom].values())
    print(dom, 'FR数:', len(result[dom]), '表数:', total)
    for fr, tbls in result[dom].items():
        print(' ', fr, [t['title'][:18] for t in tbls])
json.dump(result, open(BASE + r'/business-atlas/business-atlas/scripts/prd_fields.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('written scripts/prd_fields.json')
