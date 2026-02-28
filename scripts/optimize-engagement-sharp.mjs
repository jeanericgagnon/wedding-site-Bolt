import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const srcDir = path.resolve('assets/photos/raw-engagement-2026-02-27');
const outDir = path.resolve('public/photos/engagement');

const selected = [
  '003bf600-3a4d-4f35-976b-0586379b6785.jpg',
  '053d97ba-331e-4d85-93f9-7986e70e2874.jpg',
  '092f4223-1508-45f6-8f3d-78ca5afbb6f1.jpg',
  '18419a0b-742d-4e06-b315-c83be4e25f68.jpg',
  '1e3ee16d-404f-48e2-b949-62ed57e96c6c.jpg',
  '36788f74-4b86-4550-bee9-6b2e5fbb19f5.jpg',
  '3a6534e7-adf1-44c5-a728-94c6f6fa646c.jpg',
  '3c011ec8-ec9e-4b90-99f8-22e12da880c8.jpg',
  '45fe54f7-a753-4e5d-9913-aff3951db84f.jpg',
  '46c6527f-aabe-48ef-87c0-bfdac05c571f.jpg',
  '46ec533f-9fdb-4c8d-8f52-759efe846352.jpg',
  '47fc5b76-b923-4d85-8bd1-df4cb9cebcb8.jpg',
];

await fs.mkdir(outDir, { recursive: true });

let before = 0;
let after = 0;

for (const file of selected) {
  const src = path.join(srcDir, file);
  const out = path.join(outDir, file);

  const srcStat = await fs.stat(src);
  before += srcStat.size;

  await sharp(src)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 74, mozjpeg: true, progressive: true })
    .toFile(out);

  const outStat = await fs.stat(out);
  after += outStat.size;
}

console.log(JSON.stringify({ files: selected.length, beforeBytes: before, afterBytes: after, savingsPct: Number((((before-after)/before)*100).toFixed(1)) }, null, 2));
