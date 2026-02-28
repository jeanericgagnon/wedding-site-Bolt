from PIL import Image
from pathlib import Path

src = Path('assets/photos/raw-engagement-2026-02-27')
out = Path('assets/photos/optimized-engagement-2026-02-28')
out.mkdir(parents=True, exist_ok=True)

for p in sorted(src.glob('*.jpg')):
    img = Image.open(p).convert('RGB')
    max_dim = 1920
    img.thumbnail((max_dim, max_dim))
    target = out / (p.stem + '.webp')
    img.save(target, format='WEBP', quality=72, method=6)
    print(target.name)
