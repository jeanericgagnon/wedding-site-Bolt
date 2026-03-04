#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const SRC = '/Users/ericsysclaw/Desktop/KaraPhotos';
const OUT = path.resolve('public/preview-photos');
const exts = new Set(['.jpg','.jpeg','.png','.webp','.heic']);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function orientation(file){
  try{
    const out = execFileSync('sips',['-g','pixelWidth','-g','pixelHeight',file],{encoding:'utf8'});
    const w = Number((out.match(/pixelWidth: (\d+)/)||[])[1]||0);
    const h = Number((out.match(/pixelHeight: (\d+)/)||[])[1]||0);
    if(!w||!h) return 'unknown';
    const r=w/h;
    return r>1.2?'landscape':r<0.85?'portrait':'square';
  }catch{return 'unknown';}
}

fs.mkdirSync(OUT,{recursive:true});
const files = walk(SRC).filter(f=>exts.has(path.extname(f).toLowerCase()));
const manifest=[];
let idx=1;
for(const file of files){
  const rel = path.relative(SRC,file);
  const bucket = rel.toLowerCase().includes('engagmentevent') ? 'engagement_event' : rel.toLowerCase().includes('engagment') ? 'engagement' : 'root';
  const orient = orientation(file);
  const outName = `${String(idx).padStart(3,'0')}-${bucket}-${orient}.jpg`;
  const outPath = path.join(OUT,outName);
  try{
    execFileSync('sips',['-s','format','jpeg','-Z','1800',file,'--out',outPath],{stdio:'ignore'});
    manifest.push({src:file,url:`/preview-photos/${outName}`,bucket,orientation:orient});
    idx++;
  }catch{}
}
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({count:manifest.length,items:manifest},null,2));
console.log(`Synced ${manifest.length} photos to ${OUT}`);
