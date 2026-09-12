let sessionStarted=null, sessionTick=null, restEnd=null, restTick=null, currentEntry={};
function populateWorkoutSelects(){
  const sels=[document.getElementById('workoutSelect'),document.getElementById('garminTemplate')];
  sels.forEach(sel=>{const prev=sel.value;sel.innerHTML=Object.keys(db.templates).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');if(db.templates[prev])sel.value=prev});
}
function lastExercise(name){
  const ws=db.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date));
  for(const w of ws){const e=(w.exercises||[]).find(x=>x.name===name); if(e)return e}
  return null;
}
function progressionSuggestion(ex){
  const prev=lastExercise(ex.name); if(!prev||!prev.sets?.length)return 'Prvi vnos: izberi težo, kjer imaš približno 2 RIR.';
  const valid=prev.sets.filter(s=>+s.reps>0);
  if(!valid.length)return 'Uporabi zadnjo udobno delovno težo.';
  const lastW=Math.max(...valid.map(s=>+s.weight||0)), same=valid.filter(s=>(+s.weight||0)===lastW);
  const hit=same.length>=Math.min(ex.sets,same.length)&&same.every(s=>(+s.reps)>=ex.max && (s.rir==null||+s.rir>=1));
  if(hit&&ex.step>0)return `Predlog: ${lastW+ex.step} kg. Zadnjič si dosegel zgornji rep-range.`;
  const avg=Math.round(same.reduce((s,x)=>s+(+x.reps||0),0)/same.length*10)/10;
  return `Predlog: ${lastW} kg in poskusi izboljšati zadnjih ~${avg} pon./set proti ${ex.max}.`;
}
function renderWorkout(){
  const name=document.getElementById('workoutSelect').value||Object.keys(db.templates)[0], tpl=db.templates[name]||[];
  currentEntry={}; const host=document.getElementById('workoutBody');host.innerHTML='';
  const card=document.createElement('div');card.className='card';
  card.innerHTML=`<div class="row between"><div><h2>${esc(name)}</h2><div class="small muted">${tpl.length} vaj · double progression</div></div><span class="badge blue">LOG</span></div>`;
  tpl.forEach((ex,ei)=>{
    currentEntry[ex.name]=Array.from({length:ex.sets},()=>({weight:'',reps:'',rir:'',done:false}));
    const d=document.createElement('div');d.className='exercise';d.innerHTML=`
      <div class="exhead"><div><div class="exname">${esc(ex.name)}</div><div class="target">${ex.sets} × ${ex.min}${ex.min!==ex.max?'–'+ex.max:''}${ex.mode==='time'?' min':' reps'} · rest ${ex.rest?Math.round(ex.rest/60*10)/10+' min':'—'} · ${esc(ex.note||'')}</div></div><button class="btn smallbtn ghost" data-add="${ei}">+ set</button></div>
      <div class="suggest">${esc(progressionSuggestion(ex))}</div><div id="sets_${ei}"></div>`;
    card.appendChild(d);
  });
  host.appendChild(card); tpl.forEach((ex,ei)=>renderSets(name,ei));
}
function renderSets(tplName,ei){
  const ex=db.templates[tplName][ei], arr=currentEntry[ex.name], host=document.getElementById('sets_'+ei); if(!host)return; host.innerHTML='';
  arr.forEach((s,si)=>{
    const r=document.createElement('div');r.className='setgrid'+(ex.mode==='time'?' time':'');
    const ph1=ex.mode==='time'?'min':'kg', ph2=ex.mode==='time'?'W':'reps';
    r.innerHTML=`<div class="setnum">${si+1}</div>
      <input type="number" step="${ex.mode==='time'?'.1':'.5'}" inputmode="decimal" placeholder="${ph1}" value="${s.weight}" data-f="weight">
      <input type="number" step="1" inputmode="decimal" placeholder="${ph2}" value="${s.reps}" data-f="reps">
      <input type="number" min="0" max="5" step=".5" inputmode="decimal" placeholder="RIR" value="${s.rir}" data-f="rir">
      <input class="check" type="checkbox" ${s.done?'checked':''}>`;
    const inputs=r.querySelectorAll('input[data-f]');inputs.forEach(inp=>inp.addEventListener('input',()=>{s[inp.dataset.f]=inp.value}));
    r.querySelector('.check').addEventListener('change',ev=>{s.done=ev.target.checked;if(s.done&&ex.rest)startRest(ex.rest)});
    host.appendChild(r);
  });
}
document.getElementById('workoutBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-add]');if(!b)return;const name=document.getElementById('workoutSelect').value,ei=+b.dataset.add,ex=db.templates[name][ei];currentEntry[ex.name].push({weight:'',reps:'',rir:'',done:false});renderSets(name,ei)
});
document.getElementById('workoutSelect').addEventListener('change',renderWorkout);
function startRest(sec){restEnd=Date.now()+sec*1000;clearInterval(restTick);restTick=setInterval(()=>{const rem=Math.max(0,restEnd-Date.now());document.getElementById('restTimer').textContent=formatSec(rem/1000);if(rem<=0){clearInterval(restTick);navigator.vibrate&&navigator.vibrate([120,80,120]);toast('Počitek končan')}},250)}
function formatSec(sec){sec=Math.max(0,Math.round(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function startSession(){sessionStarted=Date.now();clearInterval(sessionTick);sessionTick=setInterval(()=>document.getElementById('sessionTimer').textContent=formatSec((Date.now()-sessionStarted)/1000),1000)}
document.getElementById('startSession').addEventListener('click',startSession);
document.getElementById('clearWorkout').addEventListener('click',()=>{if(confirm('Počistim trenutni vnos?'))renderWorkout()});
document.getElementById('finishWorkout').addEventListener('click',()=>{
  const name=document.getElementById('workoutSelect').value,tpl=db.templates[name], exercises=[];
  tpl.forEach(ex=>{
    const sets=(currentEntry[ex.name]||[]).filter(s=>s.weight!==''||s.reps!=='').map(s=>({weight:+s.weight||0,reps:+s.reps||0,rir:s.rir===''?null:+s.rir,done:!!s.done}));
    if(sets.length)exercises.push({name:ex.name,sets,mode:ex.mode||'reps'})
  });
  if(!exercises.length){alert('Vnesi vsaj en set.');return}
  db.workouts.push({id:Date.now(),date:document.getElementById('workoutDate').value,workout:name,notes:document.getElementById('workoutNotes').value,exercises,duration:sessionStarted?Math.round((Date.now()-sessionStarted)/1000):0});
  persist();toast('Trening shranjen');document.getElementById('workoutNotes').value='';clearInterval(sessionTick);sessionStarted=null;document.getElementById('sessionTimer').textContent='00:00';renderWorkout();renderDashboard();
});