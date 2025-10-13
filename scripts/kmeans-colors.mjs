import fs from 'fs';
import sharp from 'sharp';

// Simple k-means for small number of pixels and k
function kmeans(pixels, k=3, maxIter=20){
  // pixels: array of [r,g,b]
  // choose initial centers randomly
  let centers = [];
  const n = pixels.length;
  for(let i=0;i<k;i++) centers.push(pixels[Math.floor(Math.random()*n)]);

  let labels = new Array(n).fill(0);
  for(let iter=0; iter<maxIter; iter++){
    let changed = false;
    // assign
    for(let i=0;i<n;i++){
      let best=0; let bestD=Infinity;
      for(let c=0;c<k;c++){
        const d = dist2(pixels[i], centers[c]);
        if(d<bestD){ bestD=d; best=c; }
      }
      if(labels[i]!==best){ labels[i]=best; changed=true; }
    }
    // recompute
    const sums = Array(k).fill(0).map(()=>[0,0,0,0]);
    for(let i=0;i<n;i++){ const l=labels[i]; sums[l][0]+=pixels[i][0]; sums[l][1]+=pixels[i][1]; sums[l][2]+=pixels[i][2]; sums[l][3]++; }
    for(let c=0;c<k;c++){
      if(sums[c][3]===0) continue;
      centers[c] = [Math.round(sums[c][0]/sums[c][3]), Math.round(sums[c][1]/sums[c][3]), Math.round(sums[c][2]/sums[c][3])];
    }
    if(!changed) break;
  }
  // find largest cluster
  const counts = Array(k).fill(0);
  for(const l of labels) counts[l]++;
  let maxIdx = 0; for(let i=1;i<k;i++) if(counts[i]>counts[maxIdx]) maxIdx=i;
  return centers[maxIdx];
}
function dist2(a,b){ return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2; }
function toHex(rgb){ return '#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join(''); }

async function dominantFromFile(path){
  const img = sharp(path).resize(120,120,{fit:'inside'}).ensureAlpha();
  const {data, info} = await img.raw().toBuffer({ resolveWithObject:true});
  const pixels = [];
  for(let i=0;i<data.length;i+=info.channels){
    // ignore fully transparent
    if(info.channels>=4 && data[i+3]===0) continue;
    pixels.push([data[i], data[i+1], data[i+2]]);
  }
  if(pixels.length===0) return '#000000';
  const c = kmeans(pixels,3,30);
  return toHex(c);
}

(async ()=>{
  const files = ['public/images/choppies-attach.png','public/images/thuso-attach.png','public/images/woolworths-attach.png','public/images/sefalana-attach.png'];
  for(const f of files){
    if(!fs.existsSync(f)){ console.error('missing',f); continue; }
    const hex = await dominantFromFile(f);
    console.log(f, hex);
  }
})();
