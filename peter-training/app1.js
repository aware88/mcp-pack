const KEY='peterTrainingOS_v2';
const DEFAULTS={
  settings:{goalWeight:85,goalBF:20,goalVO2:52,protein:175,calories:2800,fat:75},
  plan:{
    1:["Upper A","BJJ"],
    2:["BJJ"],
    3:["Lower A","BJJ"],
    4:["BJJ"],
    5:["Upper B"],
    6:["VO₂max Echo Bike"],
    0:["Lower B (optional)"]
  },
  templates:{
    "Upper A":[
      {name:"Bench press",sets:4,min:5,max:8,rest:150,step:2.5,note:"1–2 RIR"},
      {name:"Weighted pull-ups",sets:4,min:6,max:10,rest:150,step:2.5,note:"1–2 RIR"},
      {name:"Incline dumbbell press",sets:3,min:8,max:12,rest:120,step:2,note:"1–2 RIR"},
      {name:"Chest-supported row",sets:3,min:8,max:12,rest:120,step:2.5,note:"1–2 RIR"},
      {name:"Lateral raises",sets:4,min:12,max:20,rest:75,step:1,note:"zadnja serija lahko blizu odpovedi"},
      {name:"Triceps",sets:3,min:10,max:15,rest:75,step:2.5,note:"kontrolirano"},
      {name:"Biceps",sets:3,min:10,max:15,rest:75,step:2.5,note:"kontrolirano"}
    ],
    "Lower A":[
      {name:"Full-depth back squat",sets:4,min:5,max:8,rest:180,step:5,note:"rit do tal; polna globina; stabilna tehnika"},
      {name:"Romanian deadlift",sets:3,min:6,max:10,rest:150,step:5,note:"1–2 RIR"},
      {name:"Bulgarian split squat",sets:3,min:8,max:12,rest:120,step:2,note:"na stran; samo brez bolečine"},
      {name:"Leg curl",sets:3,min:10,max:15,rest:90,step:2.5,note:"kontrolirano"},
      {name:"Calf raises",sets:3,min:10,max:15,rest:75,step:5,note:"poln razpon"},
      {name:"Abs",sets:3,min:10,max:15,rest:60,step:0,note:"hanging leg raise ali cable crunch"}
    ],
    "Upper B":[
      {name:"Incline bench press",sets:4,min:6,max:10,rest:150,step:2.5,note:"1–2 RIR"},
      {name:"Chin-ups / lat pulldown",sets:4,min:6,max:12,rest:150,step:2.5,note:"1–2 RIR"},
      {name:"Dumbbell shoulder press",sets:3,min:8,max:12,rest:120,step:2,note:"kontrolirano"},
      {name:"One-arm row",sets:3,min:8,max:12,rest:120,step:2,note:"poln razpon"},
      {name:"Lateral raises",sets:4,min:15,max:25,rest:75,step:1,note:"zadnja serija lahko blizu odpovedi"},
      {name:"Rear delts",sets:3,min:15,max:20,rest:75,step:1,note:"kontrolirano"},
      {name:"Biceps",sets:3,min:8,max:15,rest:75,step:2.5,note:"kontrolirano"},
      {name:"Triceps",sets:3,min:8,max:15,rest:75,step:2.5,note:"kontrolirano"}
    ],
    "Lower B":[
      {name:"Deadlift",sets:3,min:4,max:6,rest:210,step:5,note:"težko, brez grindanja"},
      {name:"Full-depth squat (light)",sets:3,min:8,max:10,rest:150,step:2.5,note:"lažje kot Lower A; ista polna globina"},
      {name:"Hip thrust",sets:3,min:8,max:12,rest:120,step:5,note:"1–2 RIR"},
      {name:"Hamstring curl",sets:3,min:10,max:15,rest:90,step:2.5,note:"kontrolirano"},
      {name:"Pull-ups",sets:3,min:8,max:12,rest:120,step:2.5,note:"zmerno"},
      {name:"Dumbbell bench press",sets:3,min:8,max:12,rest:120,step:2,note:"zmerno"}
    ],
    "VO₂max Echo Bike":[
      {name:"Warm-up",sets:1,min:10,max:10,rest:0,step:0,note:"10 min lahkotno",mode:"time"},
      {name:"4-min interval",sets:4,min:4,max:4,rest:180,step:0,note:"8.5–9/10; vpiši povprečne W",mode:"time"},
      {name:"Cool-down",sets:1,min:5,max:8,rest:0,step:0,note:"5–8 min lahkotno",mode:"time"}
    ]
  },
  workouts:[], metrics:[], readiness:{sleep:7,energy:7,sore:3}
};

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
  let d=null; try{d=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(!d) d=clone(DEFAULTS);
  d.settings={...DEFAULTS.settings,...(d.settings||{})};
  d.plan={...DEFAULTS.plan,...(d.plan||{})};
  d.templates={...clone(DEFAULTS.templates),...(d.templates||{})};
  d.workouts=d.workouts||[]; d.metrics=d.metrics||[]; d.readiness={...DEFAULTS.readiness,...(d.readiness||{})};
  if(!d.workouts.length){
    try{
      const old=JSON.parse(localStorage.getItem('peterTrainingLog')||'[]');
      if(Array.isArray(old) && old.length) d.workouts=old.map(w=>({...w,duration:0}));
    }catch(e){}
  }
  return d;
}
let db=load();
function persist(){localStorage.setItem(KEY,JSON.stringify(db));document.getElementById('saveStateText').textContent='shranjeno '+new Date().toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}
function isoToday(){const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(s){if(!s)return'—'; const d=new Date(s+'T12:00:00');return d.toLocaleDateString('sl-SI',{day:'numeric',month:'short'})}
function num(v,d=1){return v==null||v===''?'—':Number(v).toFixed(d).replace('.',',')}
document.getElementById('workoutDate').value=isoToday();
document.getElementById('metricDate').value=isoToday();

function switchView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='dashboard')renderDashboard();
  if(id==='plan')renderPlan();
  if(id==='progress')renderProgress();
  if(id==='library')renderLibrary();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));

function scheduledToday(){
  const day=new Date().getDay(), arr=db.plan[day]||[];
  return arr.length?arr:[];
}
function latestMetric(){
  return db.metrics.slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||{};
}
function workoutVolume(w){
  return (w.exercises||[]).reduce((sum,e)=>sum+(e.sets||[]).reduce((s,x)=>s+(+x.weight||0)*(+x.reps||0),0),0)
}
function sevenDaysAgo(){return Date.now()-7*864e5}
function calcStreak(){
  if(!db.workouts.length)return 0;
  const weeks=new Set(db.workouts.map(w=>{
    const d=new Date(w.date+'T12:00:00'); const monday=new Date(d); const day=(d.getDay()+6)%7;monday.setDate(d.getDate()-day);return monday.toISOString().slice(0,10)
  }));
  let c=0,d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7));
  while(weeks.has(d.toISOString().slice(0,10))){c++;d.setDate(d.getDate()-7)}
  return c;
}
function allPRs(){
  const prs={}; let improvements=0;
  db.workouts.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>{
    (w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>{
      if(!s.reps||!s.weight)return;
      const e1rm=+s.weight*(1+(+s.reps)/30);
      if(!prs[e.name]||e1rm>prs[e.name].e1rm){if(prs[e.name])improvements++;prs[e.name]={weight:+s.weight,reps:+s.reps,e1rm,date:w.date}}
    }))
  });
  return {prs,improvements}
}
function macros(){
  const s=db.settings, carbs=Math.max(0,Math.round((s.calories-s.protein*4-s.fat*9)/4));
  return {...s,carbs}
}
function readiness(){
  const r=db.readiness; const score=Math.round(((+r.sleep)+(+r.energy)+(11-(+r.sore)))/3*10);
  let label='GREEN', text='Normalen plan. Lahko loviš progresijo.';
  if(score<60){label='RED';text='Zmanjšaj volumen 25–40 %. Lower B raje izpusti. Brez dodatnega HIIT.'}
  else if(score<75){label='AMBER';text='Treniraj, vendar pusti 2–3 RIR in ne dodajaj ekstra serij.'}
  return {score,label,text}
}
['readySleep','readyEnergy','readySore'].forEach(id=>document.getElementById(id).addEventListener('input',e=>{
  const map={readySleep:'sleep',readyEnergy:'energy',readySore:'sore'}; db.readiness[map[id]]=+e.target.value;persist();renderReadiness()
}));
function renderReadiness(){
  const rr=readiness(), b=document.getElementById('readinessBadge'); b.textContent=rr.score+' / 100 · '+rr.label;b.className='badge '+(rr.label==='GREEN'?'green':rr.label==='AMBER'?'amber':'');
  document.getElementById('readinessText').textContent=rr.text;
}
function renderDashboard(){
  const sched=scheduledToday(), focus=sched[0]||'Recovery / walk';
  document.getElementById('todayFocus').textContent=focus;
  document.getElementById('todayAdvice').textContent=sched.length>1?'Danes: '+sched.join(' + ')+'. Če je BJJ hard, ne sili dodatnega volumna.':'Danes: '+focus+'.';
  document.getElementById('todayBadge').textContent=new Date().toLocaleDateString('sl-SI',{weekday:'short'}).toUpperCase();
  const m=latestMetric(); document.getElementById('dashWeight').textContent=num(m.weight); document.getElementById('dashBF').textContent=num(m.bf);document.getElementById('dashVO2').textContent=num(m.vo2);
  document.getElementById('goalWeightDash').textContent=num(db.settings.goalWeight);document.getElementById('goalBFDash').textContent=num(db.settings.goalBF);document.getElementById('goalVO2Dash').textContent=num(db.settings.goalVO2);
  const recent=db.workouts.filter(w=>new Date(w.date+'T23:59:59').getTime()>=sevenDaysAgo());
  document.getElementById('kpi7').textContent=recent.length;
  document.getElementById('kpiVolume').textContent=(recent.reduce((s,w)=>s+workoutVolume(w),0)/1000).toFixed(1).replace('.',',');
  document.getElementById('kpiStreak').textContent=calcStreak();
  document.getElementById('kpiPR').textContent=allPRs().improvements;
  const ma=macros();document.getElementById('caloriesKpi').textContent=ma.calories;document.getElementById('proteinKpi').textContent=ma.protein+' g';document.getElementById('fatKpi').textContent=ma.fat+' g';document.getElementById('carbsKpi').textContent=ma.carbs+' g';
  ['readySleep','readyEnergy','readySore'].forEach((id,i)=>document.getElementById(id).value=[db.readiness.sleep,db.readiness.energy,db.readiness.sore][i]);renderReadiness();
  const h=db.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  document.getElementById('dashHistory').innerHTML=h.length?h.map(w=>`<div class="history-item"><div class="row between"><div><b>${esc(w.workout)}</b><div class="small muted">${fmtDate(w.date)} · ${(workoutVolume(w)/1000).toFixed(1)} t volumna</div></div><span class="badge">${w.duration?Math.round(w.duration/60)+' min':'saved'}</span></div></div>`).join(''):'<div class="small muted">Še ni shranjenih treningov.</div>';
}
document.getElementById('startToday').addEventListener('click',()=>{
  const s=scheduledToday().find(x=>db.templates[x] || x.startsWith('Lower B'));
  if(s){document.getElementById('workoutSelect').value=s.replace(' (optional)','');renderWorkout();switchView('workout')}else switchView('workout')
});