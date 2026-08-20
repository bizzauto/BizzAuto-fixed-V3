import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const svgBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488"/>
      <stop offset="100%" style="stop-color:#14B8A6"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad)"/>
  <path d="M50 25 L70 45 L60 45 L60 75 L40 75 L40 45 L30 45 Z" fill="white"/>
</svg>`);

async function generateIcons() {
  for (const size of [96, 192, 512]) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }

  const maskableSize = 512;
  const padding = 0.1;
  const innerSize = Math.floor(maskableSize * (1 - 2 * padding));
  const offset = Math.floor(maskableSize * padding);
  const innerIcon = await sharp(svgBuffer).resize(innerSize, innerSize).toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 13, g: 148, b: 136, alpha: 1 },
    },
  })
    .composite([{ input: innerIcon, left: offset, top: offset }])
    .png()
    .toFile(path.join(publicDir, 'icon-maskable.png'));
  console.log('Created icon-maskable.png');

  const androidDir = path.join(rootDir, 'mobile-app/android/app/src/main/res');
  const androidIcons = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

  for (const [density, size] of Object.entries(androidIcons)) {
    const dir = path.join(androidDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`Created ${density} icons (${size}px)`);
  }

  await sharp(svgBuffer).resize(432, 432).png().toFile(path.join(androidDir, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png'));
  console.log('Created adaptive icon foreground');

  console.log('All icons generated!');
}

generateIcons().catch(console.error);
