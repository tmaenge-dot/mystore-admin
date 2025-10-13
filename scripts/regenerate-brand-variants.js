#!/usr/bin/env node
/*
 Regenerate perceptual brand variants (brandLight and brandStrong)
 for stores defined in data/stores.js. This script reads the JS file,
 parses the array, adjusts L in Lab color space, and writes the file
 back with updated values.

 This implementation avoids external deps by including color conversion
 helpers (sRGB <-> linear, RGB <-> XYZ, XYZ <-> Lab).
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.resolve(new URL('../data/stores.js', import.meta.url).pathname);

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (clean.length === 6) {
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  if (clean.length === 3) {
    return [((bigint >> 8) & 15) * 17, ((bigint >> 4) & 15) * 17, (bigint & 15) * 17];
  }
  throw new Error('Invalid hex ' + hex);
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
}

function srgbToLinear(v) {
  v = v / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const t = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(t * 255)));
}

function rgbToXyz([r, g, b]) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return [X, Y, Z];
}

function xyzToRgb([X, Y, Z]) {
  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
}

function xyzToLab([X, Y, Z]) {
  // D65 reference white
  const Xr = 0.95047, Yr = 1.0, Zr = 1.08883;
  function f(t) {
    return t > 0.008856 ? Math.cbrt(t) : (7.787037 * t) + (16 / 116);
  }
  const fx = f(X / Xr);
  const fy = f(Y / Yr);
  const fz = f(Z / Zr);
  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

function labToXyz([L, a, b]) {
  const Yn = 1.0;
  const Xr = 0.95047, Yr = 1.0, Zr = 1.08883;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  function finv(t) {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787037;
  }
  const X = Xr * finv(fx);
  const Y = Yr * finv(fy);
  const Z = Zr * finv(fz);
  return [X, Y, Z];
}

function lightenHex(hex, deltaL) {
  const rgb = hexToRgb(hex);
  const xyz = rgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const L = Math.max(0, Math.min(100, lab[0] + deltaL));
  const newLab = [L, lab[1], lab[2]];
  const newXyz = labToXyz(newLab);
  const newRgb = xyzToRgb(newXyz);
  return rgbToHex(newRgb.map(v => Math.round(v)));
}

function modifyStoreVariants(stores, percent) {
  // percent is positive for lighten (e.g., 20) or negative for darken (-20)
  const deltaL = percent; // treat percent as delta in L (0-100)
  return stores.map(s => {
    try {
      const base = s.brandColor || s.color || '#000000';
      const light = lightenHex(base, Math.abs(deltaL));
      const strong = lightenHex(base, -Math.abs(deltaL));
      return { ...s, brandLight: light, brandStrong: strong };
    } catch (err) {
      console.error('Failed to process store', s.id, err.message);
      return s;
    }
  });
}

function writeStoresFile(stores) {
  const content = `const stores = ${JSON.stringify(stores, null, 2)};\n\nexport default stores;\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Wrote', filePath);
}

function main() {
  const argv = process.argv.slice(2);
  let dryRun = false;
  let percent = 20;
  for (let i=0;i<argv.length;i++){
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--percent' && argv[i+1]){ percent = Number(argv[i+1]); i++; }
  }
  const src = fs.readFileSync(filePath, 'utf8');
  // Eval the file safely by replacing export default with assignment
  const modSrc = src.replace(/export default stores\s*;/, 'globalThis.__STORES__ = stores;');
  // eslint-disable-next-line no-eval
  eval(modSrc);
  const stores = globalThis.__STORES__;
  if (!Array.isArray(stores)) {
    console.error('Could not read stores array from', filePath);
    process.exit(1);
  }
  const updated = modifyStoreVariants(stores, percent);
  if (dryRun){
    console.log('Dry-run mode: showing proposed changes (first 5 stores)');
    updated.slice(0,5).forEach(s => console.log(s.id, s.brandColor, '->', s.brandLight, s.brandStrong));
  } else {
    writeStoresFile(updated);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
