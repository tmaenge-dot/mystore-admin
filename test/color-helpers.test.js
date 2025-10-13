import test from 'node:test';
import assert from 'node:assert/strict';

// Re-implement minimal helpers (pure functions) from public/branding-contrast.js
function hexToRgb(hex){ if(!hex) return [0,0,0]; const h = hex.replace('#','').trim(); if(h.length===3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)]; if(h.length===6) return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; return [0,0,0]; }
function rgbToLuminance([r,g,b]){ const srgb = [r,g,b].map(v=>{v=v/255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2]; }
function contrastRatio(hex1, hex2){ const l1 = rgbToLuminance(hexToRgb(hex1)); const l2 = rgbToLuminance(hexToRgb(hex2)); const bright = Math.max(l1,l2); const dark = Math.min(l1,l2); return (bright + 0.05) / (dark + 0.05); }

function hexToHsl(hex){ const [r,g,b]=hexToRgb(hex).map(v=>v/255); const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2; if(max!==min){ const d=max-min; s=l>0.5? d/(2-max-min): d/(max+min); switch(max){case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d + 2; break; case b: h=(r-g)/d + 4; break;} h/=6; } return [h,s,l]; }
function hslToHex([h,s,l]){ let r,g,b; if(s===0){ r=g=b=l; } else { function hue2rgb(p,q,t){ if(t<0) t+=1; if(t>1) t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p; } const q = l<0.5 ? l*(1+s) : l+s - l*s; const p = 2*l - q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); } return '#'+[Math.round(r*255),Math.round(g*255),Math.round(b*255)].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function adjustLightness(hex, delta){ const hsl=hexToHsl(hex); hsl[2]=Math.max(0,Math.min(1,hsl[2]+delta)); return hslToHex(hsl); }

test('contrastRatio produces expected values for black/white', () => {
  const whiteBlack = contrastRatio('#ffffff', '#000000');
  // per WCAG, white vs black ratio should be 21
  assert.ok(Math.abs(whiteBlack - 21) < 0.001);
  const gray = contrastRatio('#777777', '#000000');
  assert.ok(gray > 4 && gray < 10);
});

test('adjustLightness lightens and darkens predictably', () => {
  const base = '#336699';
  const lighter = adjustLightness(base, 0.2);
  const darker = adjustLightness(base, -0.2);
  assert.notEqual(lighter, base);
  assert.notEqual(darker, base);
  // lighter should have higher luminance than base
  function lum(hex){ return rgbToLuminance(hexToRgb(hex)); }
  assert.ok(lum(lighter) > lum(base));
  assert.ok(lum(darker) < lum(base));
});
