const VV_KEY = "vlotvast_v9";
const VV_PIN_KEY = "vlotvast_pin_v9";

const DEFAULT = {
  settings:{
    activeProfileId:"p1",
    sessionRounds: 8,
    requireGoodForSticker: true,
    preferNL: true,
    voice: { voiceURI:null, lang:null, name:null },
    enableAddition: false,
    enableDigraphs: false,
    digraphsUnlockLevel: 3,
    additionUnlockLevel: 4
  },
  profiles:[{id:"p1", name:"Kind 1"}],
  data:{
    "p1": {
      stickers:[],
      progress:{xp:0, level:1},
      stats:{numbers:{}, letters:{}}
    }
  }
};

const STICKERS = [
  {id:"fox", name:"Vosje", emo:"🦊"},
  {id:"unicorn", name:"Unicorn", emo:"🦄"},
  {id:"dino", name:"Dino", emo:"🦖"},
  {id:"owl", name:"Uil", emo:"🦉"},
  {id:"panda", name:"Panda", emo:"🐼"},
  {id:"cat", name:"Kat", emo:"🐱"},
  {id:"dog", name:"Hond", emo:"🐶"},
  {id:"bee", name:"Bij", emo:"🐝"},
  {id:"lady", name:"Lieveheersbeestje", emo:"🐞"},
  {id:"frog", name:"Kikker", emo:"🐸"},
  {id:"whale", name:"Walvis", emo:"🐳"},
  {id:"turtle", name:"Schildpad", emo:"🐢"},
];

const DIGRAPHS = ["aa","ee","oo","uu","ie","oe","eu","ui","au","ou"];

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function mergeDeep(t,s){ for(const k of Object.keys(s||{})){ if(s[k] && typeof s[k]==="object" && !Array.isArray(s[k])) t[k]=mergeDeep(t[k]||{}, s[k]); else t[k]=s[k]; } return t; }

function loadState(){
  try{
    const raw = localStorage.getItem(VV_KEY);
    if(!raw) return clone(DEFAULT);
    return mergeDeep(clone(DEFAULT), JSON.parse(raw));
  }catch(e){ return clone(DEFAULT); }
}
function saveState(state){ localStorage.setItem(VV_KEY, JSON.stringify(state)); }

function getPin(){ return localStorage.getItem(VV_PIN_KEY) || "1234"; }
function setPin(v){ localStorage.setItem(VV_PIN_KEY, v); }

function getActiveProfile(state){
  const id = state.settings.activeProfileId;
  if(!state.data[id]) state.data[id] = {stickers:[], progress:{xp:0,level:1}, stats:{numbers:{},letters:{}}};
  if(!state.data[id].progress) state.data[id].progress={xp:0,level:1};
  return state.data[id];
}
function ensureProgress(profile){
  if(!profile.progress) profile.progress={xp:0,level:1};
  profile.progress.level = levelFromXP(profile.progress.xp||0);
  return profile.progress;
}
function levelFromXP(xp){
  if(xp>=700) return 5;
  if(xp>=450) return 4;
  if(xp>=250) return 3;
  if(xp>=100) return 2;
  return 1;
}
function xpToNext(level, xp){
  const t={1:100,2:250,3:450,4:700,5:999999};
  return Math.max(0,(t[level]||999999)-xp);
}
function addXP(state, profile, amount){
  ensureProgress(profile);
  const before = profile.progress.level;
  profile.progress.xp = Math.max(0, (profile.progress.xp||0) + amount);
  profile.progress.level = levelFromXP(profile.progress.xp);
  saveState(state);
  return {leveledUp: profile.progress.level>before, level: profile.progress.level, xp: profile.progress.xp, next: xpToNext(profile.progress.level, profile.progress.xp)};
}

function canUseDigraphs(state, profile){
  ensureProgress(profile);
  return !!state.settings.enableDigraphs && profile.progress.level >= (state.settings.digraphsUnlockLevel||3);
}
function canUseAddition(state, profile){
  ensureProgress(profile);
  return !!state.settings.enableAddition && profile.progress.level >= (state.settings.additionUnlockLevel||4);
}

function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function ensureStat(map, key){ if(!map[key]) map[key]={seen:0, correct:0, streak:0}; return map[key]; }
function pickAdaptiveKey(keys, statsMap){
  const weights = keys.map(k=>{
    const s = ensureStat(statsMap, k);
    const acc = s.seen ? (s.correct/s.seen) : 0.0;
    const need = 1.1 - acc;
    const streakPenalty = clamp(1.0 - (s.streak*0.18), 0.35, 1.0);
    return clamp((0.2+need)*streakPenalty, 0.1, 2.2);
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<keys.length;i++){ r-=weights[i]; if(r<=0) return keys[i]; }
  return keys[keys.length-1];
}

// Speech
function getVoicesNL(preferNL=true){
  if(!("speechSynthesis" in window) || !speechSynthesis.getVoices) return [];
  const voices = speechSynthesis.getVoices() || [];
  let nl = voices.filter(v => (v.lang||"").toLowerCase().startsWith("nl"));
  if(preferNL){
    const nlNL = nl.filter(v => (v.lang||"").toLowerCase().startsWith("nl-nl"));
    const nlBE = nl.filter(v => (v.lang||"").toLowerCase().startsWith("nl-be"));
    nl = [...nlNL, ...nlBE, ...nl.filter(v => !nlNL.includes(v) && !nlBE.includes(v))];
  }
  return nl;
}
function findVoiceBySelection(sel){
  if(!sel) return null;
  const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  if(sel.voiceURI){
    const v = voices.find(x=>x.voiceURI===sel.voiceURI);
    if(v) return v;
  }
  return null;
}
function speakNL(text, state){
  if(!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "nl-NL";
  const sel = state?.settings?.voice || null;
  const v = sel ? findVoiceBySelection(sel) : null;
  if(v){ u.voice=v; u.lang=v.lang||u.lang; }
  else{
    const nl = getVoicesNL(state?.settings?.preferNL ?? true);
    if(nl.length){ u.voice=nl[0]; u.lang=nl[0].lang||u.lang; }
  }
  u.rate = 0.95; u.pitch = 1.05;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Rewards + confetti
function awardSticker(profile){
  const owned = new Set(profile.stickers||[]);
  const candidates = STICKERS.filter(s=>!owned.has(s.id));
  const pick = candidates.length ? choice(candidates) : choice(STICKERS);
  if(!owned.has(pick.id)) profile.stickers.push(pick.id);
  return pick;
}
function confetti(){
  const c=document.createElement("div");
  c.className="confetti";
  for(let i=0;i<22;i++){
    const p=document.createElement("i");
    p.style.left=(Math.random()*100)+"vw";
    p.style.animationDuration=(0.9+Math.random()*0.8)+"s";
    p.style.background=`hsl(${Math.floor(Math.random()*360)},85%,65%)`;
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(()=>c.remove(), 1700);
}

const VV_AUDIO_OK_KEY = "vlotvast_audio_ok_v9";
function isAudioOk(){ return localStorage.getItem(VV_AUDIO_OK_KEY)==="1"; }
function setAudioOk(){ localStorage.setItem(VV_AUDIO_OK_KEY,"1"); }
// Speak only when audio unlocked (iOS Safari requirement)
function safeSpeak(text, state){
  if(!isAudioOk()) return;
  speakNL(text, state);
}
