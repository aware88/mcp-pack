let editingTpl=null;
function renderLibrary(){
  const host=document.getElementById('templateList');host.innerHTML=Object.entries(db.templates).map(([n,es])=>`<div class="history-item"><div class="row between"><div><b>${esc(n)}</b><div class="small muted">${es.length} vaj · ${es.reduce((s,e)=>s+e.sets,0)} delovnih setov</div></div><button class="btn smallbtn" data-edit="${esc(n)}">Uredi</button></div><div class="tiny muted" style="margin-top:6px">${es.map(e=>`${esc(e.name)} ${e.sets}×${e.min}${e.min!==e.max?'–'+e.max:''}`).join(' · ')}</div></div>`).join('');
  populateWorkoutSelects();updateGarminText()
}
document.getElementById('templateList').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openTemplate(b.dataset.edit)});
document.getElementById('newTemplateBtn').onclick=()=>openTemplate(null);
function openTemplate(name){
  editingTpl=name;document.getElementById('templateModalTitle').textContent=name?'Uredi trening':'Nov trening';document.getElementById('tplName').value=name||'';
  const es=name?clone(db.templates[name]):[];document.getElementById('exerciseEditor').dataset.json=JSON.stringify(es);renderExerciseEditor();document.getElementById('templateModal').classList.add('show')
}
function getEditExercises(){try{return JSON.parse(document.getElementById('exerciseEditor').dataset.json||'[]')}catch(e){return[]}}
function setEditExercises(es){document.getElementById('exerciseEditor').dataset.json=JSON.stringify(es)}
function renderExerciseEditor(){
  const es=getEditExercises(),host=document.getElementById('exerciseEditor');host.innerHTML=es.map((x,i)=>`<div class="listitem" data-e="${i}"><div class="row between"><b>Vaja ${i+1}</b><button class="btn smallbtn danger" data-rm="${i}">×</button></div><div class="form2" style="margin-top:8px"><div><label>Ime</label><input data-k="name" value="${esc(x.name)}"></div><div><label>Opomba</label><input data-k="note" value="${esc(x.note||'')}"></div><div><label>Seti</label><input data-k="sets" type="number" value="${x.sets}"></div><div><label>Počitek (sek)</label><input data-k="rest" type="number" value="${x.rest||0}"></div><div><label>Min reps</label><input data-k="min" type="number" value="${x.min}"></div><div><label>Max reps</label><input data-k="max" type="number" value="${x.max}"></div><div><label>Korak teže (kg)</label><input data-k="step" type="number" step=".5" value="${x.step||0}"></div><div><label>Način</label><select data-k="mode"><option value="reps" ${!x.mode||x.mode==='reps'?'selected':''}>reps</option><option value="time" ${x.mode==='time'?'selected':''}>čas / W</option></select></div></div></div>`).join('');
}
document.getElementById('exerciseEditor').addEventListener('input',e=>{const box=e.target.closest('[data-e]');if(!box||!e.target.dataset.k)return;const es=getEditExercises(),i=+box.dataset.e,k=e.target.dataset.k;es[i][k]=['name','note','mode'].includes(k)?e.target.value:+e.target.value;setEditExercises(es)});
document.getElementById('exerciseEditor').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const es=getEditExercises();es.splice(+b.dataset.rm,1);setEditExercises(es);renderExerciseEditor()});
document.getElementById('addExercise').onclick=()=>{const es=getEditExercises();es.push({name:'Nova vaja',sets:3,min:8,max:12,rest:90,step:2.5,note:'1–2 RIR'});setEditExercises(es);renderExerciseEditor()};
document.getElementById('closeTemplateModal').onclick=()=>document.getElementById('templateModal').classList.remove('show');
document.getElementById('saveTemplate').onclick=()=>{
  const newName=document.getElementById('tplName').value.trim(),es=getEditExercises();if(!newName||!es.length){alert('Dodaj ime in vsaj eno vajo.');return}
  if(editingTpl&&editingTpl!==newName)delete db.templates[editingTpl];db.templates[newName]=es;persist();populateWorkoutSelects();renderLibrary();document.getElementById('templateModal').classList.remove('show');toast('Program shranjen')
};

function updateGarminText(){
  const sel=document.getElementById('garminTemplate'),name=sel.value||Object.keys(db.templates)[0],es=db.templates[name]||[];
  document.getElementById('garminText').value=`${name}\n\n`+es.map((e,i)=>`${i+1}. ${e.name}\n   ${e.sets} × ${e.min}${e.min!==e.max?'–'+e.max:''}${e.mode==='time'?' min':' reps'} | počitek ${e.rest||0}s | ${e.note||''}`).join('\n\n');
}
document.getElementById('garminTemplate').addEventListener('change',updateGarminText);
document.getElementById('copyGarmin').onclick=async()=>{updateGarminText();try{await navigator.clipboard.writeText(document.getElementById('garminText').value);toast('Kopirano')}catch(e){document.getElementById('garminText').select();document.execCommand('copy');toast('Kopirano')}};

function renderSettings(){
  const s=db.settings;document.getElementById('goalWeight').value=s.goalWeight;document.getElementById('goalBF').value=s.goalBF;document.getElementById('goalVO2').value=s.goalVO2;document.getElementById('goalProtein').value=s.protein;document.getElementById('goalCalories').value=s.calories;document.getElementById('goalFat').value=s.fat
}
document.getElementById('saveSettings').onclick=()=>{db.settings={goalWeight:+goalWeight.value,goalBF:+goalBF.value,goalVO2:+goalVO2.value,protein:+goalProtein.value,calories:+goalCalories.value,fat:+goalFat.value};persist();renderDashboard();toast('Nastavitve shranjene')};
document.getElementById('exportJson').onclick=()=>download('peter-training-backup.json',JSON.stringify(db,null,2),'application/json');
document.getElementById('exportCsv').onclick=()=>{
  const rows=[['date','workout','exercise','set','weight','reps','rir','duration_sec']];
  db.workouts.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach((s,i)=>rows.push([w.date,w.workout,e.name,i+1,s.weight,s.reps,s.rir??'',w.duration||0]))));
  download('peter-training-sets.csv',rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')
};
function download(name,text,type){const a=document.createElement('a'),blob=new Blob([text],{type});a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
document.getElementById('importJson').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.templates||!x.settings)throw 0;db=x;persist();boot();toast('Backup uvožen')}catch(err){alert('Neveljaven backup.')}};r.readAsText(f)});
document.getElementById('wipeData').onclick=()=>{if(confirm('Res izbrišem VSE treninge, metrike in nastavitve?')){localStorage.removeItem(KEY);db=clone(DEFAULTS);persist();boot();toast('Podatki izbrisani')}};

window.addEventListener('resize',()=>{if(document.getElementById('progress').classList.contains('active'))renderProgress()});
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

function boot(){
  populateWorkoutSelects();renderWorkout();renderDashboard();renderPlan();renderProgress();renderLibrary();renderSettings();persist()
}
boot();