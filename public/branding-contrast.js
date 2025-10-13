// Client-side branding contrast helpers for admin branding page
(function(){
  function hexToRgb(hex){ if(!hex) return [0,0,0]; const h = hex.replace('#','').trim(); if(h.length===3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)]; if(h.length===6) return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; return [0,0,0]; }
  function rgbToHex([r,g,b]){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
  function rgbToLuminance([r,g,b]){ const srgb = [r,g,b].map(v=>{v=v/255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2]; }
  function contrastRatio(hex1, hex2){ const l1 = rgbToLuminance(hexToRgb(hex1)); const l2 = rgbToLuminance(hexToRgb(hex2)); const bright = Math.max(l1,l2); const dark = Math.min(l1,l2); return (bright + 0.05) / (dark + 0.05); }
  function hexToHsl(hex){ const [r,g,b]=hexToRgb(hex).map(v=>v/255); const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2; if(max!==min){ const d=max-min; s=l>0.5? d/(2-max-min): d/(max+min); switch(max){case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d + 2; break; case b: h=(r-g)/d + 4; break;} h/=6; } return [h,s,l]; }
  function hslToHex([h,s,l]){ let r,g,b; if(s===0){ r=g=b=l; } else { function hue2rgb(p,q,t){ if(t<0) t+=1; if(t>1) t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p; } const q = l<0.5 ? l*(1+s) : l+s - l*s; const p = 2*l - q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); } return '#'+[Math.round(r*255),Math.round(g*255),Math.round(b*255)].map(v=>v.toString(16).padStart(2,'0')).join(''); }
  function adjustLightness(hex, delta){ const hsl=hexToHsl(hex); hsl[2]=Math.max(0,Math.min(1,hsl[2]+delta)); return hslToHex(hsl); }

  function updatePreviewAndContrast(){
    const inp = document.getElementById('brandColor');
    const c = (inp && inp.value) ? inp.value : '#f3f4f6';
    const preview = document.getElementById('preview'); if(preview) preview.style.background = c;
    const swBrand = document.getElementById('sw_brand'); const swStrong = document.getElementById('sw_strong'); const swLight = document.getElementById('sw_light');
    try{ if(swBrand) swBrand.style.background = c; }catch(e){}
    try{ if(swStrong) swStrong.style.background = adjustLightness(c, -0.18); }catch(e){}
    try{ if(swLight) swLight.style.background = adjustLightness(c, 0.18); }catch(e){}

    const list = document.getElementById('contrastList'); if(!list) return; list.innerHTML='';
    const checks = [
      { name: 'brand vs white text', bg: c, fg: '#ffffff' },
      { name: 'brand vs black text', bg: c, fg: '#000000' },
      { name: 'brand-light vs black text', bg: (swLight? swLight.style.background:'#ffffff'), fg: '#000000' }
    ];
    checks.forEach(ch => {
      const ratio = Math.round(contrastRatio(ch.bg, ch.fg) * 100) / 100;
      const passAA = ratio >= 4.5;
      const passAAlarge = ratio >= 3.0;
      const status = passAA ? 'PASS (AA)' : (passAAlarge ? 'WARN (large text only)' : 'FAIL');
      const color = passAA ? '#065f46' : (passAAlarge ? '#92400e' : '#991b1b');
      const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
      const left = document.createElement('div'); left.textContent = ch.name + ' — ' + ratio + ':1';
      const right = document.createElement('div'); right.innerHTML = '<strong style="color:' + color + '">' + status + '</strong>';
      row.appendChild(left); row.appendChild(right); list.appendChild(row);
      if(!passAAlarge){
        const sug = document.createElement('div'); sug.style.fontSize='12px'; sug.style.opacity='0.8'; sug.style.marginTop='4px';
        const whiteRatio = Math.round(contrastRatio(ch.bg,'#ffffff')*100)/100;
        const blackRatio = Math.round(contrastRatio(ch.bg,'#000000')*100)/100;
        const better = whiteRatio > blackRatio ? '#ffffff' : '#000000';
        sug.textContent = 'Suggestion: use ' + better + ' text (contrast ' + Math.max(whiteRatio,blackRatio) + ':1)';
        list.appendChild(sug);
      }
    });
  }
  // compute an accessible foreground suggestion for a background color
  // Lab conversions (approx, D65)
  function srgbToLinear(v){ v = v/255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
  function linearToSrgb(v){ const t = v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4)-0.055; return Math.max(0, Math.min(255, Math.round(t*255))); }
  function rgbToXyz([r,g,b]){ const R=srgbToLinear(r), G=srgbToLinear(g), B=srgbToLinear(b); return [R*0.4124564+G*0.3575761+B*0.1804375, R*0.2126729+G*0.7151522+B*0.0721750, R*0.0193339+G*0.1191920+B*0.9503041]; }
  function xyzToRgb([X,Y,Z]){ const R = X*3.2404542 + Y*-1.5371385 + Z*-0.4985314; const G = X*-0.9692660 + Y*1.8760108 + Z*0.0415560; const B = X*0.0556434 + Y*-0.2040259 + Z*1.0572252; return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)]; }
  function xyzToLab([X,Y,Z]){ const Xr=0.95047, Yr=1.0, Zr=1.08883; function f(t){ return t>0.008856 ? Math.cbrt(t) : (7.787037*t) + 16/116; } const fx=f(X/Xr), fy=f(Y/Yr), fz=f(Z/Zr); const L = 116*fy - 16; const a = 500*(fx-fy); const b = 200*(fy-fz); return [L,a,b]; }
  function labToXyz([L,a,b]){ const Xr=0.95047, Yr=1.0, Zr=1.08883; const fy=(L+16)/116; const fx=a/500 + fy; const fz=fy - b/200; function finv(t){ const t3=t*t*t; return t3>0.008856 ? t3 : (t-16/116)/7.787037; } return [Xr*finv(fx), Yr*finv(fy), Zr*finv(fz)]; }
  function hexToLab(hex){ const rgb = hexToRgb(hex); const xyz = rgbToXyz(rgb); return xyzToLab(xyz); }
  function labToHex(lab){ const xyz = labToXyz(lab); const rgb = xyzToRgb(xyz); return rgbToHex(rgb.map(v=>Math.round(v))); }

  function suggestForeground(bgHex, minRatio){
    minRatio = minRatio || 4.5;
    // prefer white/black if they already satisfy
    if (contrastRatio(bgHex, '#ffffff') >= minRatio) return '#ffffff';
    if (contrastRatio(bgHex, '#000000') >= minRatio) return '#000000';
    // compute bg Lab
    let bgLab;
    try{ bgLab = hexToLab(bgHex); }catch(e){ return '#000000'; }
    // We'll try to produce a foreground by keeping a/b inverse-ish to background to maximize contrast
    // Strategy: search L value (0..100) for a candidate that preserves bg a/b but uses high/low L to contrast.
    const ab = [bgLab[1], bgLab[2]];
    // try light text (L from 50..100)
    let low = 50, high = 100, best = null;
    for (let i=0;i<20;i++){
      const mid = (low+high)/2;
      const lab = [mid, ab[0], ab[1]];
      const hex = labToHex(lab);
      const r = contrastRatio(bgHex, hex);
      if (r >= minRatio){ best = hex; high = mid; } else { low = mid; }
    }
    if (best) return best;
    // try dark text (L from 0..50)
    low = 0; high = 50; best = null;
    for (let i=0;i<20;i++){
      const mid = (low+high)/2;
      const lab = [mid, ab[0], ab[1]];
      const hex = labToHex(lab);
      const r = contrastRatio(bgHex, hex);
      if (r >= minRatio){ best = hex; low = mid; high = mid; } else { low = mid; }
    }
    if (best) return best;
    // fallback to best of white/black
    return contrastRatio(bgHex, '#ffffff') > contrastRatio(bgHex, '#000000') ? '#ffffff' : '#000000';
  }

  document.addEventListener('input', function(e){ if(e.target && (e.target.id === 'brandColor' || e.target.id === 'textColor')) updatePreviewAndContrast(); });
  document.getElementById('logoFile')?.addEventListener('change', function(e){ try{ var f=e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(){ document.getElementById('previewLogo').src = r.result; }; r.readAsDataURL(f); }catch(err){} });
  document.getElementById('logoPath')?.addEventListener('input', function(e){ try{ document.getElementById('previewLogo').src = e.target.value||''; }catch(err){} });

  // Wire apply suggestion button
  const applyBtn = document.getElementById('applySuggestion');
  if (applyBtn){
    applyBtn.addEventListener('click', function(){
      try{
        const bg = (document.getElementById('brandColor') && document.getElementById('brandColor').value) || '#f3f4f6';
        const suggested = suggestForeground(bg, 4.5);
        const textInp = document.getElementById('textColor');
        if (textInp){ textInp.value = suggested; }
        // update preview color
        const preview = document.getElementById('preview'); if(preview) preview.style.color = suggested;
        updatePreviewAndContrast();
      }catch(e){}
    });
  }
  // initial run
  try{ updatePreviewAndContrast(); }catch(e){}
})();
