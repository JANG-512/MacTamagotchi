if (/Mobi|Android/i.test(navigator.userAgent)) {
    // Mobile specific adjustments if needed
}

const pet = document.getElementById('pet');
const screenBg = document.getElementById('screen');
const poopsContainer = document.getElementById('poops');
const prop = document.getElementById('prop');
const statusOverlay = document.getElementById('status-screen');
const statusContent = document.getElementById('status-content');
const submenuOverlay = document.getElementById('submenu');
const submenuText = document.getElementById('submenu-text');
const icons = Array.from(document.querySelectorAll('.icon')).filter(i => !i.classList.contains('alert'));
const alertIcon = document.querySelector('.icon.alert');

let isFirstRender = true;
let notifiedAlerts = { hunger: false, happy: false, sick: false, poop: false };

// Browser Permissions Setup
function requestPermissions() {
  // Notification Permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  // DeviceMotionEvent Permission (Required for iOS 13+)
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().catch(console.error);
  }
}
document.addEventListener('click', () => { requestPermissions(); }, { once: true });

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: body });
  }
}

function checkAndSendNotifications() {
  if (!state || state.isDead) return;

  if (state.hunger === 0 && !notifiedAlerts.hunger) {
    notifiedAlerts.hunger = true;
    if (!isFirstRender) sendNotification("MacTamagotchi ⚠️", "배가 고파요! 🍔");
  } else if (state.hunger > 0) {
    notifiedAlerts.hunger = false;
  }

  if (state.happy === 0 && !notifiedAlerts.happy) {
    notifiedAlerts.happy = true;
    if (!isFirstRender) sendNotification("MacTamagotchi ⚠️", "우울해요! 놀아주세요! 🎮");
  } else if (state.happy > 0) {
    notifiedAlerts.happy = false;
  }

  if (state.sick && !notifiedAlerts.sick) {
    notifiedAlerts.sick = true;
    if (!isFirstRender) sendNotification("MacTamagotchi ⚠️", "아파요! 약을 주세요! 💉");
  } else if (!state.sick) {
    notifiedAlerts.sick = false;
  }

  if (state.poops >= 4 && !notifiedAlerts.poop) {
    notifiedAlerts.poop = true;
    if (!isFirstRender) sendNotification("MacTamagotchi ⚠️", "냄새나요! 목욕시켜주세요! 🚿");
  } else if (state.poops < 4) {
    notifiedAlerts.poop = false;
  }
}

const SAVE_KEY = 'mactamagotchi_state';

const DEFAULT_STATE = {
  hunger: 2,
  happy: 2,
  poops: 0,
  age: 0,
  weight: 5,
  isDead: false,
  isSleeping: false,
  sick: false,
  lastSaved: Date.now()
};

let state = { ...DEFAULT_STATE };
let selectedIcon = -1;
let currentMenu = null; // null | 'food_submenu' | 'status'
let submenuChoice = 0; // 0 = Meal, 1 = Snack
let currentAnimClass = 'idle';
let playingAnimTimer = null;

// Audio Context for Beeps
let audioCtx;
function initAudio() {
   if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(freq = 600, duration = 0.1, type = 'square') {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function loadState() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...DEFAULT_STATE, ...parsed };
      const minutesPassed = Math.floor((Date.now() - state.lastSaved) / 60000);
      if (minutesPassed > 0 && !state.isDead) {
        state.hunger = Math.max(0, state.hunger - Math.floor(minutesPassed / 60));
        state.happy = Math.max(0, state.happy - Math.floor(minutesPassed / 60));
        state.age += Math.floor(minutesPassed / 1440);
      }
      state.lastSaved = Date.now();
    } catch(e){}
  }
  renderApp();
}

function saveState() {
  state.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  renderApp();
}

function setAnim(anim) {
  if (currentAnimClass) pet.classList.remove(currentAnimClass);
  currentAnimClass = anim;
  if(anim) pet.classList.add(anim);
}

function renderApp() {
  if(!state) return;

  if (state.isDead) {
    setAnim('');
    pet.classList.add('dead');
    prop.className = 'prop hidden';
    poopsContainer.innerHTML = '';
    alertIcon.classList.remove('active');
    return;
  } else {
    pet.classList.remove('dead');
  }

  // Render Icons
  icons.forEach((ic, idx) => {
    if (idx === selectedIcon) ic.classList.add('selected');
    else ic.classList.remove('selected');
  });

  // Alert
  if (state.hunger === 0 || state.happy === 0 || state.sick || state.poops >= 4) {
    alertIcon.classList.add('active');
  } else {
    alertIcon.classList.remove('active');
  }

  checkAndSendNotifications();
  isFirstRender = false;

  let extraFlags = state.sick ? '🤒 ' : '';
  poopsContainer.innerHTML = extraFlags + '💩'.repeat(state.poops);

  // Sleeping Dim
  if (state.isSleeping) {
    screenBg.style.background = '#394a39';
    if(!playingAnimTimer) setAnim('idle');
  } else {
    screenBg.style.background = '';
    if(!playingAnimTimer && !currentMenu) {
        let t = 'idle';
        if (state.sick) t = 'sick';
        else if (state.happy === 0) t = 'sad';
        else if (currentAnimClass === 'sick' || currentAnimClass === 'sad') t = 'idle';
        if (t !== 'idle' || currentAnimClass === 'sick' || currentAnimClass === 'sad') setAnim(t);
    }
  }
}

function showProp(emoji, time, animClass) {
  prop.innerText = emoji;
  prop.className = 'prop';
  setAnim(animClass);
  clearTimeout(playingAnimTimer);
  playingAnimTimer = setTimeout(() => {
    prop.className = 'prop hidden';
    playingAnimTimer = null;
    setAnim('idle');
    renderApp();
  }, time);
}

function renderStatus() {
  const hHearts = Array.from({length: 4}).map((_, i) => `<div class="heart ${i < state.hunger ? 'filled' : ''}"></div>`).join('');
  const hpHearts = Array.from({length: 4}).map((_, i) => `<div class="heart ${i < state.happy ? 'filled' : ''}"></div>`).join('');
  
  statusContent.innerHTML = `
    <p>HUNGRY</p>
    <div class="hearts">${hHearts}</div>
    <p>HAPPY</p>
    <div class="hearts">${hpHearts}</div>
    <p>AGE: ${state.age} YR</p>
    <p>WGT: ${state.weight} lb</p>
  `;
}

// ------ GAME LOOP ------ //

// 60-second background logic tick
setInterval(() => {
  if (state.isDead) return;
  
  if (!state.isSleeping) {
    if (Math.random() < 0.05) state.hunger = Math.max(0, state.hunger - 1);
    if (Math.random() < 0.05) state.happy = Math.max(0, state.happy - 1);
    if (Math.random() < 0.05 && state.poops < 4) state.poops++;
    if ((state.poops >= 3 || state.hunger === 0) && Math.random() < 0.1) state.sick = true;
  }
  if (Math.random() < 0.001) state.age++;
  
  if (state.hunger === 0 && state.happy === 0 && state.sick && state.poops >= 4) {
     if (Math.random() < 0.2) state.isDead = true;
  }
  saveState();
}, 60000);

// ------ PLATFORM-AWARE ACTIVITY ENGINE ------ //

if (window.electronAPI && window.electronAPI.onCpuUpdate) {
  // PC / Electron Mode Context
  document.body.classList.add('electron-mode');
  window.electronAPI.onCpuUpdate((usage) => {
    if (state && (state.isDead || state.isSleeping || currentMenu || playingAnimTimer)) return;
    
    let targetAnim = 'idle';
    if (state.sick) {
      targetAnim = 'sick';
    } else if (state.happy === 0) {
      targetAnim = 'sad';
    } else if (usage > 60) {
      targetAnim = 'running';
    } else if (usage > 25) {
      targetAnim = 'walking';
    }
    setAnim(targetAnim);
  });
} else {
  // Mobile / Web Browser Mode Context
  let lastAcceleration = 0;
  
  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (acc) {
        let mag = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
        if (event.accelerationIncludingGravity && !event.acceleration) {
            mag = Math.abs(mag - 9.8); // Simple gravity offset if true accel isn't available
        }
        lastAcceleration = Math.max(lastAcceleration, mag); // Keep peak movement
      }
    });
  }

  // Update animation based on sensors every second
  setInterval(() => {
    if (state.isDead || state.isSleeping || currentMenu || playingAnimTimer) return;
    
    let targetAnim = 'idle';
    if (state.sick) {
      targetAnim = 'sick';
    } else if (state.happy === 0) {
      targetAnim = 'sad';
    } else if (lastAcceleration > 12) { 
      targetAnim = 'running';
    } else if (lastAcceleration > 3) { 
      targetAnim = 'walking';
    }
    
    setAnim(targetAnim);
    lastAcceleration *= 0.5; // decay
  }, 1000);
}

// ------ BUTTON LOGIC ------ //
const handleBtnA = () => {
  initAudio();
  if(!state) return;
  if (state.isDead) return;
  beep(800, 0.05);
  
  if (currentMenu === null) {
    selectedIcon = (selectedIcon + 1) % icons.length;
    renderApp();
  } else if (currentMenu === 'food_submenu') {
    submenuChoice = (submenuChoice === 0) ? 1 : 0;
    submenuText.innerText = submenuChoice === 0 ? "MEAL" : "SNACK";
  }
};

const handleBtnB = () => {
  initAudio();
  if(!state) return;
  if (state.isDead) { // Restart Game
    if(confirm("Restart?")) {
      state = { ...DEFAULT_STATE };
      state.lastSaved = Date.now();
      saveState();
    }
    return;
  }
  
  beep(1000, 0.08);

  if (currentMenu === null) {
    if (selectedIcon === -1) return;
    const action = icons[selectedIcon].getAttribute('data-action');
    
    // Prevent some actions if sleeping
    if (state.isSleeping && action !== 'light') return;

    if (action === 'food') {
      currentMenu = 'food_submenu';
      submenuChoice = 0;
      submenuOverlay.classList.remove('hidden');
      submenuText.innerText = "MEAL";
    } else if (action === 'bath') {
      if (state.poops > 0) {
        state.poops = 0;
        showProp('🚿', 1500, 'bathing');
      }
    } else if (action === 'med') {
      if(state.sick) {
        state.sick = false;
        showProp('💉', 1500, 'walking');
      }
    } else if (action === 'light') {
      state.isSleeping = !state.isSleeping;
    } else if (action === 'play') {
      state.happy = Math.min(4, state.happy + 1);
      state.weight = Math.max(1, state.weight - 1);
      showProp('🎾', 2500, 'playing');
    } else if (action === 'status') {
      currentMenu = 'status';
      statusOverlay.classList.remove('hidden');
      renderStatus();
    } else if (action === 'discipline') {
      showProp('💢', 1000, 'idle');
    }
    
    selectedIcon = -1; 
    saveState();
  } else if (currentMenu === 'food_submenu') {
    submenuOverlay.classList.add('hidden');
    currentMenu = null;
    
    if (submenuChoice === 0) { // Meal
      state.hunger = Math.min(4, state.hunger + 1);
      state.weight += 1;
      showProp('🍱', 2500, 'eating');
    } else { // Snack
      state.happy = Math.min(4, state.happy + 1);
      state.weight += 2;
      showProp('🍰', 2500, 'eating');
    }
    saveState();
  }
};

const handleBtnC = () => {
  initAudio();
  if(!state || state.isDead) return;
  beep(600, 0.05);

  if (currentMenu !== null) {
    currentMenu = null;
    submenuOverlay.classList.add('hidden');
    statusOverlay.classList.add('hidden');
  } else {
    selectedIcon = -1;
    renderApp();
  }
};

document.getElementById('btn-a').addEventListener('click', handleBtnA);
document.getElementById('btn-b').addEventListener('click', handleBtnB);
document.getElementById('btn-c').addEventListener('click', handleBtnC);

// Init
loadState();
