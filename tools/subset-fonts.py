"""Build a tiny Dela Gothic One subset with only the characters this project uses.

The fontsource package ships the full Japanese font as one file. We cut it down
to ASCII plus every CJK and kana character found in the source.
Run: python3 tools/subset-fonts.py
"""
import glob, os
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ''
for f in glob.glob(f'{ROOT}/src/**/*.js', recursive=True) + glob.glob(f'{ROOT}/*.html'):
    text += open(f, encoding='utf-8').read()
jp = {c for c in text if ord(c) > 0x2E7F}
ascii_ = {chr(i) for i in range(32, 127)}
extra = set('、。・ー「」！？々°×✓✎◆★☆…“”‘’')
chars = ''.join(sorted(jp | ascii_ | extra))
print('characters:', len(chars))

src = f'{ROOT}/node_modules/@fontsource/dela-gothic-one/files/dela-gothic-one-japanese-400-normal.woff2'
font = TTFont(src)
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
sub = subset.Subsetter(opts)
sub.populate(text=chars)
sub.subset(font)
out = f'{ROOT}/src/shared/fonts/dela-gothic-one-subset.woff2'
font.flavor = 'woff2'
font.save(out)
print('wrote', out, os.path.getsize(out), 'bytes')
