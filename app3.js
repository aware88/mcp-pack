const DAYS=['Ned','Pon','Tor','Sre','Čet','Pet','Sob'];
function renderPlan(){
  const host=document.getElementById('weekPlan'),today=new Date().getDay();host.innerHTML='';
  [1,2,3,4,5,6,0].forEach(d=>{const el=document.createElement('div');el.className='day'+(d===today?' today':'');el.innerHTML=`<b>${DAYS[d]}</b>${(db.plan[d]||[]).map(x=>`<div class="item">${esc(x)}</div>`).join('')||'<div class="item muted">Recovery</div>'}`;host.appendChild(el)})
}
document.getElementById('editPlanBtn').addEventListener('click',()=>{const host=document.getElementById('planEditor');host.innerHTML='';[1,2,3,4,5,6,0].forEach(d=>{const x=document.createElement('div');x.style.marginTop='10px';x.innerHTML=`<label>${DAYS[d]}</label><input data-day="${d}" value="${esc((db.plan[d]||[]).join(', '))}" placeholder="Upper A, BJJ">`;host.appendChild(x)});document.getElementById('planModal').classList.add('show')});
document.getElementById('closePlanModal').onclick=()=>document.getElementById('planModal').classList.remove('show');
document.getElementById('savePlan').onclick=()=>{document.querySelectorAll('#planEditor input').forEach(i=>db.plan[i.dataset.day]=i.value.split(',').map(s=>s.trim()).filter(Boolean));persist();renderPlan();document.getElementById('planModal').classList.remove('show');toast('Plan shranjen')};

document.getElementById('saveMetric').addEventListener('click',()=>{
  const fields={weight:'metricWeight',bf:'metricBF',waist:'metricWaist',vo2:'metricVO2',rhr:'metricRHR',hrv:'metricHRV',steps:'metricSteps',acute:'metricAcute',chronic:'metricChronic'};
  const m={id:Date.now(),date:document.getElementById('metricDate').value};
  Object.entries(fields).forEach(([k,id])=>{const v=document.getElementById(id).value;if(v!=='')m[k]=+v});
  if(Object.keys(m).length<=2){alert('Vnesi vsaj eno metriko.');return}
  const same=db.metrics.findIndex(x=>x.date===m.date);
  if(same>=0) db.metrics[same]={...db.metrics[same],...m}; else db.metrics.push(m);
  persist();toast('Metrike shranjene');renderProgress();renderDashboard();
});
function chart(canvasId,key,label){
  const c=document.getElementById(canvasId),ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,w=c.clientWidth||400,h=220;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const data=db.metrics.filter(m=>m[key]!=null).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  ctx.font='11px -apple-system';ctx.fillStyle='#9fb0c2';
  if(data.length<2){ctx.fillText('Vnesi vsaj 2 meritvi za graf.',14,24);return}
  const vals=data.map(x=>+x[key]),min=Math.min(...vals),max=Math.max(...vals),pad=Math.max((max-min)*.2,key==='vo2'?1:.5),lo=min-pad,hi=max+pad;
  ctx.strokeStyle='#26384d';ctx.lineWidth=1;for(let i=0;i<4;i++){const y=18+i*(h-44)/3;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(w-10,y);ctx.stroke()}
  ctx.strokeStyle='#55d6be';ctx.lineWidth=2.5;ctx.beginPath();
  data.forEach((p,i)=>{const x=14+i*(w-28)/(data.length-1),y=18+(hi-p[key])/(hi-lo)*(h-44);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  const last=data.at(-1),x=w-14,y=18+(hi-last[key])/(hi-lo)*(h-44);ctx.fillStyle='#55d6be';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6f9fc';ctx.fillText(label+': '+last[key],14,h-8)
}
function renderProgress(){
  const m=latestMetric(), fields=[['Teža',m.weight,'kg'],['Body fat',m.bf,'%'],['Pas',m.waist,'cm'],['VO₂max',m.vo2,''],['Resting HR',m.rhr,' bpm'],['HRV',m.hrv,' ms'],['Koraki',m.steps,''],['Load ratio',m.acute&&m.chronic?(m.acute/m.chronic).toFixed(2):null,'']];
  document.getElementById('latestMetrics').innerHTML=fields.map(x=>`<div class="metricline"><span>${x[0]}</span><b>${x[1]==null?'—':x[1]+x[2]}</b></div>`).join('');
  requestAnimationFrame(()=>{chart('weightChart','weight','kg');chart('bfChart','bf','%');chart('waistChart','waist','cm');chart('vo2Chart','vo2','VO₂max')});
  const {prs}=allPRs();document.getElementById('prList').innerHTML=Object.keys(prs).length?Object.entries(prs).sort().map(([n,p])=>`<div class="history-item"><div class="row between"><div><b>${esc(n)}</b><div class="small muted">${fmtDate(p.date)} · e1RM ${p.e1rm.toFixed(1)} kg</div></div><span class="badge green">${p.weight} × ${p.reps}</span></div></div>`).join(''):'<div class="small muted">PR-ji se pojavijo po shranjenih treningih.</div>';
  const hist=db.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  document.getElementById('fullHistory').innerHTML=hist.length?hist.map(w=>`<div class="history-item"><div class="row between"><div><b>${esc(w.workout)}</b><div class="small muted">${fmtDate(w.date)} · ${(workoutVolume(w)/1000).toFixed(1)} t</div></div><button class="btn smallbtn danger" data-del="${w.id}">izbriši</button></div><div class="tiny muted" style="margin-top:6px">${(w.exercises||[]).map(e=>`${esc(e.name)}: ${(e.sets||[]).map(s=>`${s.weight}×${s.reps}${s.rir!=null?' @RIR'+s.rir:''}`).join(' · ')}`).join('<br>')}</div></div>`).join(''):'<div class="small muted">Ni zgodovine.</div>';
}
document.getElementById('fullHistory').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;if(confirm('Izbrišem ta trening?')){db.workouts=db.workouts.filter(w=>String(w.id)!==String(b.dataset.del));persist();renderProgress();renderDashboard()}});