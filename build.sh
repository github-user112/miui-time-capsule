#!/usr/bin/env bash
# 生成可提交的小米浏览器互动应用 ZIP（纯静态，根目录 index.html）
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist miui-time-capsule.zip
mkdir -p dist
cp index.html styles.css app.js data.js dist/
(cd dist && zip -q -r ../miui-time-capsule.zip . -x '*.DS_Store' '__MACOSX/*')
python3 - <<'PY'
import os, zipfile, re
z = zipfile.ZipFile('miui-time-capsule.zip')
names = z.namelist()
bad = []
for n in names:
    if n.startswith('/') or n.startswith('\\') or '..' in n.split('/') or '\\' in n:
        bad.append('unsafe path: ' + n)
    if re.search(r'\.(exe|sh|bat|cmd|php|jsp|py|env|map)$', n, re.I):
        bad.append('forbidden file: ' + n)
    if n.endswith(('.html', '.css', '.js')):
        txt = z.read(n).decode('utf-8', 'ignore')
        if re.search(r'https?://', txt):
            bad.append('external URL in ' + n)
ok_entry = 'index.html' in names
zsize = os.path.getsize('miui-time-capsule.zip')
usize = sum(i.file_size for i in z.infolist())
print('entry:        ', 'PASS' if ok_entry else 'FAIL')
print('files:        ', len(names), '(limit 300)')
print('zip size:     ', zsize, 'bytes (limit 20971520)')
print('unpacked:     ', usize, 'bytes (limit 52428800)')
print('path/safety:  ', 'PASS' if not bad else 'FAIL')
print('external URLs:', 'none' if not bad else 'see below')
for b in bad: print('  -', b)
assert ok_entry and not bad and zsize <= 20971520 and usize <= 52428800 and len(names) <= 300
print('\nZIP: ' + os.path.abspath('miui-time-capsule.zip'))
PY
