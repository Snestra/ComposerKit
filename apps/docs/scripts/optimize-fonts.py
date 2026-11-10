#!/usr/bin/env python3
"""Regenerate fonts: uv run --with fonttools==4.67.0 python scripts/optimize-fonts.py

Run from ui/ after changing the original font inputs or their CSS coverage.
Then build the app and check rendering, loading, and coverage against the baseline.
Next fingerprints the CSS font URLs and the two preloads from the generated files.
Requires Node.js and the project's installed formatter. Inputs are the 13 WOFF2 files emitted by
Next 16.4.3 next/font/google for Inter and Geist Mono at project HEAD
54577424ffcd9767e50fe24c465a4122d2058f03. coverage.json records their
original CSS face order and ranges. OFL notices accompany the inputs and outputs.
"""
import json
import shutil
import subprocess
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / 'scripts' / 'font-sources'
OUTPUT = ROOT / 'public' / 'fonts'

# FontTools needs Brotli for WOFF2. Use the Node runtime already used by the app.
brotli = types.ModuleType('brotli')
def codec(data, action, mode=0):
    code = """const z=require('node:zlib'),a=[];process.stdin.on('data',x=>a.push(x));process.stdin.on('end',()=>{const b=Buffer.concat(a);process.stdout.write(process.argv[1]==='decompress'?z.brotliDecompressSync(b):z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_MODE]:+process.argv[2],[z.constants.BROTLI_PARAM_QUALITY]:11}}))})"""
    return subprocess.run(['node', '-e', code, action, str(mode)], input=data, stdout=subprocess.PIPE, check=True).stdout
brotli.decompress = lambda data: codec(data, 'decompress')
brotli.compress = lambda data, mode=0: codec(data, 'compress', mode)
brotli.MODE_FONT = 2
brotli.MODE_TEXT = 1
sys.modules['brotli'] = brotli

from fontTools import subset
from fontTools.ttLib import TTFont

if '--help' in sys.argv:
    print(__doc__)
    sys.exit(0)
if len(sys.argv) != 1:
    raise SystemExit('Run with --help for usage')

records = json.loads((SOURCES / 'coverage.json').read_text())
files = {item['file']: item for item in records['files']}
css = []
original_coverage = {}
output_coverage = {}
OUTPUT.mkdir(parents=True, exist_ok=True)
for face in records['css_faces']:
    descriptors = face['descriptors'].copy()
    src = descriptors['src']
    if '../media/' in src:
        name = src.split('../media/')[-1].split(')')[0]
        item = files[name]
        allowed = set()
        for part in item['subset'].split(','):
            token = part.strip()[2:]
            if '?' in token:
                low, high = int(token.replace('?', '0'), 16), int(token.replace('?', 'F'), 16)
            elif '-' in token:
                low, high = (int(value, 16) for value in token.split('-'))
            else:
                low = high = int(token, 16)
            allowed.update(range(low, high + 1))
        font = TTFont(SOURCES / name, recalcTimestamp=False)
        original_coverage.setdefault(item['family'], set()).update(font.getBestCmap())
        chars = allowed & set(font.getBestCmap())
        options = subset.Options()
        options.layout_features = ['*']
        options.recalc_timestamp = False
        options.notdef_outline = True
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=chars)
        sub.subset(font)
        font.flavor = 'woff2'
        destination = OUTPUT / name
        font.save(destination)
        actual = set(TTFont(destination).getBestCmap())
        if actual != chars:
            raise ValueError(f'{name}: output cmap does not match the declared range')
        output_coverage.setdefault(item['family'], set()).update(actual)
        descriptors['src'] = f'url("../../public/fonts/{name}") format("woff2")'
        descriptors['unicode-range'] = ','.join(f'U+{c:X}' for c in sorted(actual))
        print(f'{item["family"]} {name}: {destination.stat().st_size} bytes, {len(actual)} characters')
    css.append('@font-face {\n' + ''.join(f'  {key}: {value};\n' for key, value in descriptors.items()) + '}\n')
if len(files) != 13 or original_coverage != output_coverage:
    raise ValueError('Generated fonts do not preserve all original family coverage')
css.append(':root { --font-inter: "Inter", "Inter Fallback"; --font-sans: var(--font-inter); --font-mono: "Geist Mono", "Geist Mono Fallback"; }\n')
(ROOT / 'app' / '(gallery)' / 'fonts.css').write_text('\n'.join(css))
for name in ('Inter-OFL.txt', 'Inter-upstream-OFL.txt', 'GeistMono-OFL.txt'):
    shutil.copyfile(SOURCES / name, OUTPUT / name)
subprocess.run([str(ROOT.parent.parent / 'node_modules' / '.bin' / 'oxfmt'), 'app/(gallery)/fonts.css'], cwd=ROOT, check=True)
