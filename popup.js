
function todayKey(d=new Date()){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,'0')+"-"+String(d.getDate()).padStart(2,'0');
}

function colorForRatio(r){
  // r in [0,1]; interpolate responsive thresholds
  if(r<=0) return '#f1f5f9'; // very light
  if(r<0.25) return '#bbf7d0';
  if(r<0.5) return '#86efac';
  if(r<0.75) return '#22c55e';
  return '#16a34a';
}

function render(){
  chrome.storage.local.get(["days","settings"],res=>{
    const days = res.days || {};
    const settings = res.settings || { dailyTarget:50 };
    const today = days[todayKey()]?.count || 0;
    document.getElementById("todayMain").innerText = `${today} / ${settings.dailyTarget}`;
    document.getElementById("targetInput").value = settings.dailyTarget;

    const keys = Object.keys(days).sort();
    let best=0,longest=0,tmp=0,prev=null;
    keys.forEach(k=>{
      const c = days[k].count || 0; best = Math.max(best,c);
      if(c>0){
        if(prev && (new Date(k)-new Date(prev)===86400000)) tmp++; else tmp=1;
        longest = Math.max(longest,tmp);
        prev = k;
      } else { tmp=0; prev=null; }
    });

    let cur=0, d=new Date();
    while(days[todayKey(d)]?.count>0){ cur++; d.setDate(d.getDate()-1); }
    document.getElementById("streak").innerText = cur;
    document.getElementById("longest").innerText = longest;
    document.getElementById("best").innerText = best;

    const counts = keys.map(k=>days[k].count||0);
    const avg = n => { const last = counts.slice(-n); if(last.length===0) return 0; return Math.round((last.reduce((a,b)=>a+b,0)/last.length)*10)/10; };
    document.getElementById("avg7").innerText = avg(7).toFixed(1);
    document.getElementById("avg30").innerText = avg(30).toFixed(1);

    let bestWeek = 0;
    for(let i=0;i<counts.length;i++){ bestWeek = Math.max(bestWeek, counts.slice(i,i+7).reduce((a,b)=>a+b,0)); }
    document.getElementById("bestWeek").innerText = bestWeek;

    drawHeatmap(days, settings);
  });
}

// Draw heatmap with latest on right and responsive colors by ratio to target
function drawHeatmap(days, settings){
  const c = document.getElementById('heatmap'), t = document.getElementById('hmTooltip'), ctx = c.getContext('2d');
  const weeks = 26, box = 9, gap = 4;
  const width = weeks*(box+gap)+8, height = 7*(box+gap);
  c.width = width; c.height = height; ctx.clearRect(0,0,width,height);
  const today = new Date(); const start = new Date(today); start.setDate(start.getDate() - weeks*7 + 1);
  const cells = [];
  for(let w=0; w<weeks; w++){
    for(let d=0; d<7; d++){
      const dt = new Date(start); dt.setDate(start.getDate() + w*7 + d);
      const k = todayKey(dt);
      const entry = days[k] || { count:0, target: settings.dailyTarget };
      const cnt = entry.count || 0; const tgt = entry.target || settings.dailyTarget;
      const ratio = Math.min(cnt / Math.max(1, tgt), 1);
      const color = colorForRatio(ratio);
      const x = (weeks-1-w)*(box+gap); const y = d*(box+gap);
      // rounded square
      roundRect(ctx, x, y, box, box, 3, color);
      cells.push({ x, y, date: new Date(dt), count: cnt, target: tgt });
    }
  }

  c.onmousemove = function(e){
    const rect = c.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const found = cells.find(cell => mx >= cell.x && mx <= cell.x + box && my >= cell.y && my <= cell.y + box);
    if(!found){ t.style.display='none'; return; }
    t.style.display='block'; t.innerHTML = '<strong>' + found.date.toDateString() + '</strong><div style="margin-top:6px">' + found.count + ' replies / ' + found.target + ' target</div>';
    let left = e.pageX + 12, top = e.pageY + 12; if(left + 220 > window.innerWidth) left = e.pageX - 230; if(top + 120 > window.innerHeight) top = e.pageY - 120;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  };
  c.onmouseleave = function(){ t.style.display='none'; };
}

// helper: rounded rect
function roundRect(ctx, x, y, w, h, r, color){
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}

// emoji tooltip: custom tooltip showing data-info attribute
function setupEmojiTooltips(){
  const tt = document.createElement('div'); tt.id = '__emoji_tooltip'; Object.assign(tt.style, { position:'fixed', display:'none', background:'#0b1220', color:'#fff', padding:'8px 10px', borderRadius:'8px', fontSize:'12px', zIndex:999999 });
  document.body.appendChild(tt);
  document.querySelectorAll('.emoji-item').forEach(el=>{
    el.addEventListener('mouseenter', (e)=>{
      const info = el.getAttribute('data-info') || '';
      if(!info) return;
      tt.innerText = info; tt.style.display = 'block';
      tt.style.left = (e.pageX + 12) + 'px'; tt.style.top = (e.pageY + 12) + 'px';
    });
    el.addEventListener('mousemove', (e)=>{ tt.style.left = (e.pageX + 12) + 'px'; tt.style.top = (e.pageY + 12) + 'px'; });
    el.addEventListener('mouseleave', ()=>{ tt.style.display = 'none'; });
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  render();
  setupEmojiTooltips();
  document.getElementById('targetInput').addEventListener('change', (e)=>{
    const v = Math.max(1, Math.round(Number(e.target.value) || 0));
    chrome.storage.local.get(['settings'], res=>{
      const s = res.settings || { dailyTarget:50 }; s.dailyTarget = v; chrome.storage.local.set({ settings: s }, render);
    });
  });
  window.addEventListener('replyCommit.updated', ()=> render());
});
