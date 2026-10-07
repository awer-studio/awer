// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyA7Kr-HEEs11OZdsTX_vEy3bakPyAd-hhQ",
  authDomain: "awer-d4af4.firebaseapp.com",
  projectId: "awer-d4af4",
  storageBucket: "awer-d4af4.firebasestorage.app",
  messagingSenderId: "989372203453",
  appId: "1:989372203453:web:382c94fc504d96b5c512d4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const IMGBB_KEY = "c2a5f5a7794a778caac28687e2257fac";
const maintenanceRef = db.collection('siteSettings').doc('maintenance');

// ============================================
// AUDIO
// ============================================
let audioContext = null;
function initAudio() {
  try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}

function playWelcomeSound() {
  if (!audioContext) return;
  // Resume context if suspended (browser policy)
  if (audioContext.state === 'suspended') audioContext.resume();
  
  const now = audioContext.currentTime;
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.5);
  });
}

// ============================================
// STATE
// ============================================
let S = {
  cu: null,
  theme: localStorage.getItem('awt') || 'dark',
  route: { p: 'home', params: {} },
  settings: JSON.parse(localStorage.getItem('aws') || '{"notif":true}'),
  isFirstDeveloper: false
};

const CATS = [
  {id:'ai',n:'AI',i:''},{id:'design',n:'Дизайн',i:'🎨'},{id:'photo',n:'Фото',i:'📷'},
  {id:'video',n:'Видео',i:'🎬'},{id:'music',n:'Музыка',i:'🎵'},{id:'study',n:'Учёба',i:''},
  {id:'work',n:'Работа',i:'💼'},{id:'productivity',n:'Продуктивность',i:'⚡'},
  {id:'utils',n:'Утилиты',i:'🛠'},{id:'dev',n:'Разработка',i:'💻'},
  {id:'security',n:'Безопасность',i:'🔐'},{id:'docs',n:'Документы',i:'📄'},
  {id:'games',n:'Игры',i:'🎮'},{id:'other',n:'Другое',i:'📦'}
];

const COLS = ['#e8f5e9','#e3f2fd','#fce4ec','#fff3e0','#f3e5f5','#e0f2f1','#fff8e1','#e8eaf6','#fbe9e7','#e0f7fa'];

// ============================================
// UTILITIES
// ============================================
function $(s, c) { return (c || document).querySelector(s); }
function $$(s, c) { return Array.from((c || document).querySelectorAll(s)); }

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
  }
  const fc = [];
  function fl(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (Array.isArray(arr[i])) fl(arr[i]);
      else if (arr[i] != null) fc.push(arr[i]);
    }
  }
  fl(children);
  fc.forEach(c => e.append(c.nodeType ? c : document.createTextNode(String(c))));
  return e;
}

function fp(p) { return p === 0 ? 'Бесплатно' : (p ? p.toLocaleString('ru-RU') + ' ₽' : '0 ₽'); }
function fd(ts) { return ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''; }
function ft(ts) { return ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''; }
function col(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return COLS[Math.abs(h) % COLS.length];
}

function toast(t, m, tp) {
  const e = el('div', { class: 'toast ' + (tp || 'inf') },
    el('div', { class: 'toast-icon', html: tp === 'ok' ? '✓' : tp === 'er' ? '✕' : 'ℹ' }),
    el('div', {}, el('strong', {}, t), m ? ' ' + m : '')
  );
  $('#toasts').append(e);
  setTimeout(() => { e.style.opacity = '0'; setTimeout(() => e.remove(), 200); }, 2500);
}

function openM(c, l) {
  $('#modalContent').className = 'modal' + (l ? ' lg' : '');
  $('#modalContent').innerHTML = '';
  $('#modalContent').append(c);
  $('#modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeM() {
  $('#modal').classList.remove('active');
  document.body.style.overflow = '';
}

$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeM(); });

function nav(p, params) {
  S.route = { p: p, params: params || {} };
  window.scrollTo(0, 0);
  render();
  updateTabs();
}

function toggleTheme() {
  S.theme = S.theme === 'light' ? 'dark' : 'light';
  saveSettings();
  document.documentElement.setAttribute('data-theme', S.theme);
  $('#themeBtn').textContent = S.theme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// SPLASH & WELCOME (ИСПРАВЛЕНО: ГАРАНТИРОВАННЫЙ ТАЙМАУТ)
// ============================================
let splashHidden = false;

function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  $('#splashProgressFill').style.width = '100%';
  $('#splashStatus').textContent = 'Готово!';
  setTimeout(() => {
    $('#splash-screen').classList.add('hide');
    setTimeout(() => {
      $('#splash-screen').style.display = 'none';
      // Звук играет только после действия пользователя (закрытие welcome), чтобы браузер не заблокировал
    }, 800);
  }, 300);
}

// ГАРАНТИРОВАННОЕ ИСЧЕЗНОВЕНИЕ ЧЕРЕЗ 5 СЕКУНД
setTimeout(() => { hideSplash(); }, 5000);

function showWelcome() {
  if (localStorage.getItem('aww')) return;
  $('#welcome-overlay').classList.remove('hidden');
}

function closeWelcome() {
  $('#welcome-overlay').classList.add('hidden');
  localStorage.setItem('aww', '1');
  playWelcomeSound(); // Играем звук по клику (браузеры разрешают)
}

// ============================================
// AUTH
// ============================================
async function registerWithNick(nick, role) {
  return new Promise((resolve, reject) => {
    if (nick === 'awer_studio') {
      resolve({ uid: 'official_awer_studio', nick: 'awer_studio', name: 'awer_studio', role: 'developer', avatar: '🏆', verified: true, official: true, blocked: false, isAdmin: true, isFirstDeveloper: true });
      return;
    }
    nick = nick.toLowerCase().trim();
    db.collection('system').doc('config').get().then(async configDoc => {
      let isFirstDev = false;
      if (!configDoc.exists) {
        isFirstDev = true;
        const uid = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await db.collection('system').doc('config').set({
          firstDeveloperUid: uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      db.collection('users').where('nick', '==', nick).limit(1).get().then(snap => {
        if (!snap.empty) { reject(new Error('Ник занят')); return; }
        const uid = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const userData = {
          nick, name: nick, role: role || 'buyer', avatar: nick[0].toUpperCase(),
          verified: false, official: false, blocked: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (role === 'developer' && isFirstDev) {
          userData.isAdmin = true;
          userData.isFirstDeveloper = true;
        }
        db.collection('users').doc(uid).set(userData).then(() => {
          resolve({ 
            uid, nick, name: nick, role: role || 'buyer', 
            avatar: nick[0].toUpperCase(), verified: false, 
            official: false, blocked: false,
            isAdmin: isFirstDev && role === 'developer',
            isFirstDeveloper: isFirstDev && role === 'developer'
          });
        }).catch(err => reject(new Error(err.message)));
      }).catch(err => reject(new Error('Ошибка сети')));
    }).catch(err => reject(new Error('Ошибка конфигурации')));
  });
}

function loginWithNick(nick) {
  return new Promise((resolve, reject) => {
    if (nick === 'awer_studio') {
      resolve({ uid: 'official_awer_studio', nick: 'awer_studio', name: 'awer_studio', role: 'developer', avatar: '', verified: true, official: true, blocked: false, isAdmin: true, isFirstDeveloper: true });
      return;
    }
    nick = nick.toLowerCase().trim();
    db.collection('users').where('nick', '==', nick).limit(1).get().then(snap => {
      if (snap.empty) { reject(new Error('Не найден')); return; }
      const doc = snap.docs[0];
      const data = doc.data();
      if (data.blocked) { reject(new Error('Заблокирован')); return; }
      
      db.collection('system').doc('config').get().then(configDoc => {
        let isAdmin = false;
        let isFirstDeveloper = false;
        if (configDoc.exists && doc.id === configDoc.data().firstDeveloperUid) {
          isAdmin = true;
          isFirstDeveloper = true;
        }
        resolve({ 
          uid: doc.id, nick, name: data.name || nick, 
          role: data.role || 'buyer', avatar: data.avatar || nick[0].toUpperCase(), 
          verified: data.verified || false, official: false, blocked: data.blocked || false,
          isAdmin: isAdmin,
          isFirstDeveloper: isFirstDeveloper
        });
      }).catch(() => {
        resolve({ 
          uid: doc.id, nick, name: data.name || nick, 
          role: data.role || 'buyer', avatar: data.avatar || nick[0].toUpperCase(), 
          verified: data.verified || false, official: false, blocked: data.blocked || false,
          isAdmin: false, isFirstDeveloper: false
        });
      });
    }).catch(err => reject(new Error('Ошибка сети')));
  });
}

function logoutUser() {
  localStorage.removeItem('awn');
  S.cu = null;
  render();
  updateAuthBtn();
  toast('Вы вышли', '', 'inf');
}

function saveSettings() {
  localStorage.setItem('awt', S.theme);
  localStorage.setItem('aws', JSON.stringify(S.settings));
}

function updateAuthBtn() {
  if (S.cu) {
    $('#authBtn').textContent = S.cu.name;
    $('#authBtn').onclick = () => nav('profile');
  } else {
    $('#authBtn').textContent = 'Войти';
    $('#authBtn').onclick = showAuth;
  }
}

function updateTabs() {
  $$('.tab-btn').forEach(el => el.classList.remove('active'));
  const p = S.route.p;
  let activeTab = 'home';
  if (p === 'catalog') {
    if (S.route.params && S.route.params.top) activeTab = 'top';
    else if (S.route.params && S.route.params.cat === 'games') activeTab = 'children';
    else activeTab = 'categories';
  } else if (p === 'tutorial') activeTab = 'tutorial';
  else if (p === 'admin') activeTab = 'admin';
  
  const tab = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
  if (tab) tab.classList.add('active');
  
  $$('.mobile-nav-btn').forEach(el => el.classList.remove('active'));
  const mActive = document.querySelector(`.mobile-nav-btn[data-page="${p}"]`);
  if (mActive) mActive.classList.add('active');
}

// ============================================
// DATA
// ============================================
let appsCache = null;

function getApps(cb) {
  if (appsCache) { cb(appsCache); return; }
  db.collection('apps').where('status', '==', 'verified').orderBy('createdAt', 'desc').get()
    .then(snap => {
      const a = [];
      snap.forEach(d => a.push({ id: d.id, ...d.data() }));
      appsCache = a;
      cb(a);
    })
    .catch(e => { console.error(e); cb([]); });
}

function getAppById(id, cb) {
  db.collection('apps').doc(id).get()
    .then(d => { if (d.exists) cb({ id: d.id, ...d.data() }); else cb(null); })
    .catch(() => cb(null));
}

// ============================================
// INIT (ИСПРАВЛЕНО: ПРОСТОЙ И НАДЁЖНЫЙ)
// ============================================
async function initializeApp() {
  initAudio();
  try {
    $('#splashProgressFill').style.width = '20%';
    $('#splashStatus').textContent = 'Загрузка профиля...';
    
    const savedNick = localStorage.getItem('awn');
    if (savedNick) {
      try { S.cu = await loginWithNick(savedNick); } catch (e) { localStorage.removeItem('awn'); }
    }
    
    $('#splashProgressFill').style.width = '50%';
    $('#splashStatus').textContent = 'Загрузка каталога...';
    
    await new Promise(resolve => {
      let resolved = false;
      getApps(function(apps) {
        if (!resolved) { resolved = true; appsCache = apps; resolve(); }
      });
      setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 4000);
    });
    
    $('#splashProgressFill').style.width = '80%';
    $('#splashStatus').textContent = 'Подготовка...';
    
    saveSettings();
    render();
    updateAuthBtn();
    updateTabs();
    
    hideSplash();
  } catch (error) {
    console.error('Init error:', error);
    try { render(); updateAuthBtn(); updateTabs(); } catch (e) {}
    hideSplash();
  }
}

initializeApp();

// ============================================
// RENDER ROUTER
// ============================================
function render() {
  document.documentElement.setAttribute('data-theme', S.theme);
  $('#themeBtn').textContent = S.theme === 'dark' ? '☀️' : '🌙';
  const c = $('#mainContent');
  c.innerHTML = '';
  const p = S.route.p;
  
  const pages = {
    home: rHome, catalog: rCatalog, app: rAppPage, favorites: rFavorites,
    orders: rOrders, chat: rChat, library: rLibrary, profile: rProfile,
    developer: rDeveloper, admin: rAdmin, settings: rSettings,
    settingsSub: rSettingsSub, about: rAbout, support: rSupport, tutorial: rTutorial
  };
  
  const fn = pages[p] || rHome;
  const result = fn();
  
  if (result && typeof result.then === 'function') {
    result.then(r => { if (c.innerHTML === '') c.append(r); });
  } else {
    c.append(result);
  }
}

// ============================================
// PAGES
// ============================================
function rHome() {
  const w = el('div', {});
  if (!appsCache || appsCache.length === 0) {
    w.append(el('div', { class: 'empty' },
      el('div', { class: 'empty-icon' }, '📦'),
      el('h3', {}, 'Каталог пока пуст'),
      el('p', {}, 'Станьте первым разработчиком!'),
      el('button', { class: 'btn btn-primary', style: 'margin-top: 12px;', onclick: () => { if (!S.cu) { showAuth(); return; } if (S.cu.role !== 'developer') { toast('Нужен аккаунт разработчика', '', 'er'); return; } nav('developer', { tab: 'add' }); } }, 'Опубликовать приложение')
    ));
    return w;
  }
  
  const apps = appsCache;
  
  const pop = el('div', { class: 'section' });
  pop.append(el('div', { class: 'section-header' }, el('h2', {}, 'Популярные приложения'), el('div', { class: 'arrow', onclick: () => nav('catalog') }, '→')));
  const car = el('div', { class: 'carousel' });
  apps.slice(0, 10).forEach(a => { car.append(rAppCardH(a)); });
  pop.append(car);
  w.append(pop);

  const free = apps.filter(a => a.price === 0);
  if (free.length) {
    const tf = el('div', { class: 'section' });
    tf.append(el('div', { class: 'section-header' }, el('h2', {}, 'Топ бесплатных'), el('div', { class: 'arrow', onclick: () => nav('catalog') }, '→')));
    const c2 = el('div', { class: 'carousel' });
    free.forEach(a => { c2.append(rAppCardH(a)); });
    tf.append(c2);
    w.append(tf);
  }

  const paid = apps.filter(a => a.price > 0);
  if (paid.length) {
    const tp = el('div', { class: 'section' });
    tp.append(el('div', { class: 'section-header' }, el('h2', {}, 'Топ платных'), el('div', { class: 'arrow', onclick: () => nav('catalog') }, '→')));
    const c3 = el('div', { class: 'carousel' });
    paid.forEach(a => { c3.append(rAppCardH(a)); });
    tp.append(c3);
    w.append(tp);
  }

  const cs = el('div', { class: 'section' });
  cs.append(el('div', { class: 'section-header' }, el('h2', {}, 'Категории'), el('div', { class: 'arrow', onclick: () => nav('catalog') }, '→')));
  const ch = el('div', { class: 'carousel' });
  CATS.forEach(c => {
    const card = el('div', { class: 'app-card', onclick: () => nav('catalog', { cat: c.id }) });
    card.append(el('div', { class: 'app-icon', style: 'background:' + col(c.id) }, c.i));
    card.append(el('div', { class: 'app-name' }, c.n));
    ch.append(card);
  });
  cs.append(ch);
  w.append(cs);
  
  return w;
}

function rAppCardH(a) {
  const card = el('div', { class: 'app-card', onclick: () => nav('app', { id: a.id }) });
  if (a.iconUrl) { card.append(el('div', { class: 'app-icon' }, el('img', { src: a.iconUrl, alt: a.name }))); }
  else { card.append(el('div', { class: 'app-icon', style: 'background:' + col(a.id) }, a.icon || '📱')); }
  card.append(el('div', { class: 'app-name' }, a.name));
  card.append(el('div', { class: 'app-rating' }, el('span', {}, (a.rating ? a.rating.toFixed(1) : '—')), el('span', { class: 'star' }, '★')));
  return card;
}

function rAppListItem(a) {
  const item = el('div', { class: 'app-list-item', onclick: () => nav('app', { id: a.id }) });
  if (a.iconUrl) { item.append(el('div', { class: 'app-icon' }, el('img', { src: a.iconUrl }))); }
  else { item.append(el('div', { class: 'app-icon', style: 'background:' + col(a.id) }, a.icon || '')); }
  const info = el('div', { class: 'info' });
  info.append(el('div', { class: 'name' }, a.name, a.official ? el('span', { style: 'color:#ffd700;font-size:12px' }, '🏆') : null));
  info.append(el('div', { class: 'cat' }, a.devName || '—'));
  const meta = el('div', { class: 'meta' });
  if (a.rating) meta.append(el('span', {}, a.rating.toFixed(1), ' ', el('span', { class: 'star' }, '★')));
  if (a.price === 0) meta.append(el('span', {}, 'Бесплатно'));
  else if (a.price) meta.append(el('span', {}, fp(a.price)));
  info.append(meta);
  item.append(info);
  return item;
}

function rCatalog() {
  const w = el('div', {});
  const q = (S.route.params && S.route.params.search) ? S.route.params.search.toLowerCase().trim() : '';
  const cat = S.route.params && S.route.params.cat;
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px; color: var(--text);' }, q ? 'Результаты: "' + q + '"' : 'Каталог'));
  const ch = el('div', { class: 'carousel', style: 'margin-bottom: 16px;' });
  ch.append(el('div', { class: 'app-card', onclick: () => nav('catalog') }, el('div', { class: 'app-icon', style: 'background: var(--primary); color: #fff;' }, 'Все'), el('div', { class: 'app-name' }, 'Все')));
  CATS.forEach(c => {
    const card = el('div', { class: 'app-card', onclick: () => nav('catalog', { cat: c.id }) });
    card.append(el('div', { class: 'app-icon', style: 'background:' + col(c.id) }, c.i));
    card.append(el('div', { class: 'app-name' }, c.n));
    ch.append(card);
  });
  w.append(ch);
  const apps = appsCache || [];
  let filteredApps = apps;
  if (q) filteredApps = apps.filter(a => a.name.toLowerCase().indexOf(q) >= 0 || (a.desc || '').toLowerCase().indexOf(q) >= 0);
  if (cat) filteredApps = apps.filter(a => a.cat === cat);
  w.append(el('p', { style: 'color: var(--text3); margin-bottom: 12px; font-size: 12px;' }, 'Найдено: ' + filteredApps.length));
  if (filteredApps.length === 0) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, ''), el('h3', {}, 'Ничего не найдено'))); }
  else { const list = el('div', { class: 'app-list' }); filteredApps.forEach(a => { list.append(rAppListItem(a)); }); w.append(list); }
  return w;
}

function rAppPage() {
  const w = el('div', { class: 'app-page' });
  const appId = (S.route.params && S.route.params.id) ? S.route.params.id : null;
  if (!appId) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Не найдено'))); return w; }
  const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
  w.append(loading);
  getAppById(appId, function(a) {
    loading.remove();
    if (!a) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Не найдено'))); return; }
    const header = el('div', { class: 'app-page-header' });
    let iconDiv;
    if (a.iconUrl) { iconDiv = el('div', { class: 'app-page-icon' }, el('img', { src: a.iconUrl })); }
    else { iconDiv = el('div', { class: 'app-page-icon', style: 'background:' + col(a.id) }, a.icon || '📱'); }
    const info = el('div', { class: 'app-page-info' });
    info.append(el('h1', {}, a.name));
    const devLine = el('div', { class: 'app-page-dev' }, a.devName || 'Неизвестный');
    if (a.official) devLine.append(el('span', { style: 'color: #ffd700; font-size: 14px;' }, '🏆'));
    else if (a.devVerified) devLine.append(el('span', { style: 'color: var(--primary);' }, '✓'));
    info.append(devLine);
    const stats = el('div', { class: 'app-page-stats' });
    stats.append(el('div', { class: 'app-stat' }, el('div', { class: 'val' }, a.rating ? a.rating.toFixed(1) : '—'), el('div', { class: 'lbl' }, (a.reviews || 0) + ' отзывов')));
    stats.append(el('div', { class: 'app-stat' }, el('div', { class: 'val' }, (a.installs || 0).toLocaleString('ru-RU')), el('div', { class: 'lbl' }, 'установок')));
    stats.append(el('div', { class: 'app-stat' }, el('div', { class: 'val' }, fp(a.price || 0)), el('div', { class: 'lbl' }, 'цена')));
    stats.append(el('div', { class: 'app-stat' }, el('div', { class: 'val' }, a.ver || '1.0'), el('div', { class: 'lbl' }, 'версия')));
    info.append(stats);
    const actions = el('div', { class: 'app-page-actions' });
    
    // ИСПРАВЛЕНИЕ: АВТОМАТИЧЕСКАЯ ВЫДАЧА ФАЙЛА ДЛЯ БЕСПЛАТНЫХ
    if (a.price === 0 && a.fileName && a.fileUrl) {
      actions.append(el('a', { class: 'btn-download', href: a.fileUrl, target: '_blank', download: a.fileName || 'file' }, ' Скачать бесплатно'));
      if (S.cu) {
        const lib = JSON.parse(localStorage.getItem('awl_' + S.cu.uid) || '{}');
        if (!lib[a.id]) { lib[a.id] = { date: Date.now() }; localStorage.setItem('awl_' + S.cu.uid, JSON.stringify(lib)); }
      }
    } else if (a.price > 0) {
      actions.append(el('button', { class: 'btn-install', onclick: () => openOrder(a.id) }, 'Оставить заявку'));
    } else {
      actions.append(el('button', { class: 'btn-install', onclick: () => toast('Файл не добавлен', '', 'inf') }, 'Скачать'));
    }
    
    actions.append(el('button', { class: 'btn-icon-sm', onclick: () => toggleFav(a.id), title: 'В избранное' }, '♡'));
    actions.append(el('button', { class: 'btn-icon-sm', onclick: () => openReport(a.id), title: 'Пожаловаться' }, '⚑'));
    info.append(actions);
    header.append(iconDiv, info);
    w.append(header);
    if (a.screenshots && a.screenshots.length > 0) {
      const ss = el('div', { class: 'section' });
      ss.append(el('div', { class: 'section-header' }, el('h2', {}, 'Скриншоты'), el('div', { class: 'arrow' }, '→')));
      const row = el('div', { class: 'screenshots-row' });
      a.screenshots.forEach(sh => { const item = el('div', { class: 'screenshot-item', onclick: () => openScreenshotViewer(a.screenshots, sh) }); item.append(el('img', { src: sh.url })); row.append(item); });
      ss.append(row); w.append(ss);
    }
    const desc = el('div', { class: 'app-description' });
    desc.append(el('h3', {}, 'Об этом приложении'));
    desc.append(el('p', {}, a.desc || 'Описание не добавлено.'));
    if (a.features && a.features.length) { desc.append(el('h3', { style: 'margin-top: 16px;' }, 'Возможности')); a.features.forEach(f => { desc.append(el('p', {}, '✓ ' + f)); }); }
    if (a.sys) { desc.append(el('h3', { style: 'margin-top: 16px;' }, 'Системные требования')); desc.append(el('p', {}, a.sys)); }
    w.append(desc);
    w.append(el('div', { style: 'padding: 16px 0; border-top: 1px solid var(--border);' }, el('div', { class: 'chat-warning' }, el('strong', {}, '⚠️ '), 'awer не принимает платежи. Оплата в чате с продавцом.')));
  });
  return w;
}

function toggleFav(appId) {
  if (!S.cu) { showAuth(); return; }
  const cuId = S.cu.uid;
  const favs = JSON.parse(localStorage.getItem('awf_' + cuId) || '{}');
  if (favs[appId]) { delete favs[appId]; toast('Удалено из избранного', '', 'inf'); }
  else { favs[appId] = true; toast('Добавлено в избранное', '', 'ok'); }
  localStorage.setItem('awf_' + cuId, JSON.stringify(favs));
}

function rFavorites() {
  const w = el('div', {});
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'Избранное'));
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '🔐'), el('h3', {}, 'Войдите'))); return w; }
  const cuId = S.cu.uid;
  const favs = JSON.parse(localStorage.getItem('awf_' + cuId) || '{}');
  const ids = Object.keys(favs);
  if (ids.length === 0) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '♡'), el('h3', {}, 'Пока пусто'))); return w; }
  const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
  w.append(loading);
  Promise.all(ids.map(id => db.collection('apps').doc(id).get())).then(docs => {
    loading.remove();
    const apps = [];
    docs.forEach(doc => { if (doc.exists) apps.push({ id: doc.id, ...doc.data() }); });
    if (apps.length === 0) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Удалены'))); return; }
    const list = el('div', { class: 'app-list' });
    apps.forEach(a => { list.append(rAppListItem(a)); });
    w.append(list);
  }).catch(() => { loading.remove(); w.append(el('div', { class: 'empty' }, el('h3', {}, 'Ошибка'))); });
  return w;
}

function rOrders() {
  const w = el('div', {});
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'Мои заявки'));
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '🔐'), el('h3', {}, 'Войдите'))); return w; }
  const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
  w.append(loading);
  Promise.all([db.collection('orders').where('buyerUid', '==', S.cu.uid).get(), db.collection('orders').where('devUid', '==', S.cu.uid).get()]).then(([s1, s2]) => {
    loading.remove();
    const orders = [];
    s1.forEach(d => { orders.push({ id: d.id, ...d.data() }); });
    s2.forEach(d => { const o = { id: d.id, ...d.data() }; if (!orders.find(x => x.id === o.id)) orders.push(o); });
    orders.sort((a, b) => (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0));
    if (orders.length === 0) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '📋'), el('h3', {}, 'Заявок нет'))); return; }
    orders.forEach(o => {
      getAppById(o.appId, function(a) {
        if (!a) return;
        const sm = { new: ['Новая', '#f9ab00'], accepted: ['Принята', '#81c995'], discussion: ['Обсуждение', '#8ab4f8'], completed: ['Завершена', '#81c995'], cancelled: ['Отменена', '#f28b82'] };
        const st = sm[o.status] || sm.new;
        const c = el('div', { class: 'order-card' });
        if (a.iconUrl) { c.append(el('div', { class: 'order-icon' }, el('img', { src: a.iconUrl }))); }
        else { c.append(el('div', { class: 'order-icon', style: 'background:' + col(a.id) }, a.icon || '')); }
        c.append(el('div', { class: 'order-info' }, el('h4', {}, a.name), el('p', {}, o.buyerUid === S.cu.uid ? 'Продавец: ' + (o.devName || '') : 'Покупатель: ' + (o.buyerName || '')), el('p', {}, fd(o.createdAt)), el('span', { style: 'color:' + st[1] + '; font-size: 11px; font-weight: 600;' }, st[0])));
        const ac = el('div', { class: 'order-actions' });
        if (o.status !== 'cancelled' && o.status !== 'completed') { ac.append(el('button', { class: 'btn btn-primary btn-sm', onclick: () => nav('chat', { orderId: o.id }) }, 'Чат')); }
        c.append(ac); w.append(c);
      });
    });
  }).catch(() => { loading.remove(); w.append(el('div', { class: 'empty' }, el('h3', {}, 'Ошибка'))); });
  return w;
}

function rChat() {
  const w = el('div', { class: 'chat-container' });
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Войдите'))); return w; }
  const orderId = (S.route.params && S.route.params.orderId) ? S.route.params.orderId : null;
  if (!orderId) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Чат не найден'))); return w; }
  const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
  w.append(loading);
  db.collection('orders').doc(orderId).get().then(doc => {
    loading.remove();
    if (!doc.exists) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Не найден'))); return w; }
    const o = { id: doc.id, ...doc.data() };
    if (o.buyerUid !== S.cu.uid && o.devUid !== S.cu.uid) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Нет доступа'))); return w; }
    const isB = o.buyerUid === S.cu.uid;
    const otherName = isB ? o.devName : o.buyerName;
    const hd = el('div', { class: 'chat-header' });
    hd.append(el('h3', {}, '💬 Чат сделки'));
    hd.append(el('p', { style: 'font-size: 12px; color: var(--text3); margin: 4px 0;' }, 'Приложение: ', el('strong', {}, o.appName || '—'), ' · ', el('strong', {}, otherName || '—')));
    hd.append(el('div', { class: 'chat-warning' }, el('strong', {}, '⚠️ '), 'awer не участвует в оплате.'));
    w.append(hd);
    const ms = el('div', { class: 'chat-messages' });
    db.collection('orders').doc(orderId).collection('messages').orderBy('createdAt', 'asc').onSnapshot(snap => {
      ms.innerHTML = '';
      if (snap.empty) { ms.append(el('div', { style: 'text-align: center; color: var(--text3); padding: 32px; font-size: 13px;' }, 'Начните общение')); }
      snap.forEach(doc => { const m = doc.data(); const me = m.senderUid === S.cu.uid; ms.append(el('div', { class: 'msg ' + (me ? 'me' : 'other') }, !me ? el('div', { style: 'font-size: 10px; font-weight: 600; margin-bottom: 3px; opacity: 0.8;' }, m.senderName) : null, el('div', {}, m.text), el('span', { class: 'msg-time' }, ft(m.createdAt)))); });
      ms.scrollTop = ms.scrollHeight;
    });
    w.append(ms);
    if (o.status !== 'cancelled' && o.status !== 'completed') {
      const inp = el('div', { class: 'chat-input-row' });
      const input = el('input', { placeholder: 'Написать сообщение...' });
      const sendBtn = el('button', { class: 'btn btn-primary' });
      sendBtn.textContent = 'Отправить';
      sendBtn.addEventListener('click', () => { const t = input.value.trim(); if (!t) return; db.collection('orders').doc(orderId).collection('messages').add({ senderUid: S.cu.uid, senderName: S.cu.name, text: t, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); input.value = ''; if (o.status === 'new' || o.status === 'accepted') { db.collection('orders').doc(orderId).update({ status: 'discussion' }); } });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });
      inp.append(input, sendBtn); w.append(inp);
      const ac = el('div', { style: 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;' });
      if (isB && !o.buyerConfirmed) {
        const btn = el('button', { class: 'btn btn-primary btn-sm' });
        btn.textContent = '✓ Завершил сделку';
        btn.addEventListener('click', () => { db.collection('orders').doc(orderId).update({ buyerConfirmed: true }); db.collection('orders').doc(orderId).collection('messages').add({ senderUid: 'sys', senderName: 'Система', text: 'Покупатель подтвердил.', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); if (o.devConfirmed) { db.collection('orders').doc(orderId).update({ status: 'completed' }); const lib = JSON.parse(localStorage.getItem('awl_' + S.cu.uid) || '{}'); lib[o.appId] = { date: Date.now() }; localStorage.setItem('awl_' + S.cu.uid, JSON.stringify(lib)); toast('Готово', 'В библиотеке', 'ok'); } toast('Подтверждено', '', 'ok'); });
        ac.append(btn);
      } else if (isB) { ac.append(el('span', { class: 'btn btn-outline btn-sm', style: 'cursor: default; font-size: 11px;' }, '✓ Вы подтвердили')); }
      if (!isB && !o.devConfirmed) {
        const btn = el('button', { class: 'btn btn-primary btn-sm' });
        btn.textContent = '✓ Подтвердить';
        btn.addEventListener('click', () => { db.collection('orders').doc(orderId).update({ devConfirmed: true }); db.collection('orders').doc(orderId).collection('messages').add({ senderUid: 'sys', senderName: 'Система', text: 'Продавец подтвердил.', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); if (o.buyerConfirmed) { db.collection('orders').doc(orderId).update({ status: 'completed' }); const lib = JSON.parse(localStorage.getItem('awl_' + o.buyerUid) || '{}'); lib[o.appId] = { date: Date.now() }; localStorage.setItem('awl_' + o.buyerUid, JSON.stringify(lib)); } toast('Подтверждено', '', 'ok'); });
        ac.append(btn);
      } else if (!isB) { ac.append(el('span', { class: 'btn btn-outline btn-sm', style: 'cursor: default; font-size: 11px;' }, '✓ Вы подтвердили')); }
      const cancelBtn = el('button', { class: 'btn btn-danger btn-sm' });
      cancelBtn.textContent = 'Отменить';
      cancelBtn.addEventListener('click', () => { if (!confirm('Отменить сделку?')) return; db.collection('orders').doc(orderId).update({ status: 'cancelled' }); db.collection('orders').doc(orderId).collection('messages').add({ senderUid: 'sys', senderName: 'Система', text: 'Сделка отменена.', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); });
      ac.append(cancelBtn); w.append(ac);
    } else { w.append(el('div', { style: 'text-align: center; padding: 16px; color: var(--text3); font-size: 13px;' }, o.status === 'completed' ? '✓ Завершена' : '✕ Отменена')); }
  }).catch(() => { loading.remove(); w.append(el('div', { class: 'empty' }, el('h3', {}, 'Ошибка'))); });
  return w;
}

function rLibrary() {
  const w = el('div', {});
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'Моя библиотека'));
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Войдите'))); return w; }
  const cuId = S.cu.uid;
  const lib = JSON.parse(localStorage.getItem('awl_' + cuId) || '{}');
  const ids = Object.keys(lib);
  if (ids.length === 0) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '📚'), el('h3', {}, 'Пусто'))); return w; }
  const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
  w.append(loading);
  Promise.all(ids.map(id => db.collection('apps').doc(id).get())).then(docs => {
    loading.remove();
    const list = el('div', { class: 'app-list' });
    docs.forEach(doc => {
      if (!doc.exists) return;
      const a = { id: doc.id, ...doc.data() };
      const item = rAppListItem(a);
      if (a.fileName && a.fileUrl) { item.append(el('a', { class: 'btn btn-primary btn-sm', href: a.fileUrl, target: '_blank', download: a.fileName, style: 'margin-left: 8px; font-size: 11px;' }, '⬇ Скачать')); }
      list.append(item);
    });
    w.append(list);
  }).catch(() => { loading.remove(); w.append(el('div', { class: 'empty' }, el('h3', {}, 'Ошибка'))); });
  return w;
}

function rProfile() {
  const w = el('div', {});
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '🔐'), el('h3', {}, 'Войдите'), el('button', { class: 'btn btn-primary', style: 'margin-top: 12px;', onclick: showAuth }, 'Войти'))); return w; }
  const u = S.cu;
  const layout = el('div', { class: 'profile-layout' });
  const card = el('div', { class: 'profile-card' });
  card.append(el('div', { class: 'profile-avatar' }, u.avatar || '👤'));
  card.append(el('h3', {}, u.name, u.official ? el('span', { style: 'color: #ffd700; font-size: 16px;' }, '🏆') : null));
  card.append(el('div', { class: 'role' }, '@' + u.nick + ' · ' + (u.role === 'buyer' ? 'Покупатель' : u.role === 'developer' ? 'Разработчик' : 'Администратор') + (u.isAdmin ? ' 👑' : '')));
  const logoutBtn = el('button', { class: 'btn btn-outline btn-full', style: 'margin-top: 10px; font-size: 12px;' });
  logoutBtn.textContent = 'Выйти';
  logoutBtn.addEventListener('click', () => { logoutUser(); });
  card.append(logoutBtn);
  layout.append(card);
  const content = el('div', {});
  const tab = (S.route.params && S.route.params.tab) ? S.route.params.tab : 'info';
  const menu = el('div', { class: 'profile-menu', style: 'margin-bottom: 16px;' });
  [['info', '👤', 'Аккаунт'], ['orders', '📋', 'Заявки'], ['library', '', 'Библиотека'], ['favorites', '♡', 'Избранное'], ['settings', '️', 'Настройки'], ['support', '', 'Поддержка']].forEach(x => { menu.append(el('div', { class: 'profile-menu-item' + (tab === x[0] ? ' active' : ''), onclick: () => nav('profile', { tab: x[0] }) }, el('span', {}, x[1]), el('span', {}, x[2]))); });
  if (u.role === 'developer') { const b = el('div', { class: 'profile-menu-item', onclick: () => nav('developer') }); b.append(el('span', {}, '🛠')); b.append(el('span', {}, 'Консоль')); menu.append(b); }
  if (u.isAdmin) { const b = el('div', { class: 'profile-menu-item', onclick: () => nav('admin') }); b.append(el('span', {}, '⚙️')); b.append(el('span', {}, 'Админ-панель')); menu.append(b); }
  content.append(menu);
  if (tab === 'info') {
    content.append(el('div', { class: 'section' }, el('h3', { style: 'font-size: 15px; font-weight: 500; margin-bottom: 12px;' }, 'Личные данные'), el('div', { class: 'form-group' }, el('label', {}, 'Ник'), el('input', { class: 'form-control', id: 'pN', value: u.name })), el('button', { class: 'btn btn-primary', onclick: () => { const n = $('#pN').value.trim(); if (!n) { toast('Введите ник', '', 'er'); return; } db.collection('users').doc(S.cu.uid).update({ name: n, avatar: n[0].toUpperCase() }); S.cu.name = n; S.cu.avatar = n[0].toUpperCase(); render(); updateAuthBtn(); toast('Сохранено', '', 'ok'); } }, 'Сохранить')));
  } else if (tab === 'orders') { content.append(rOrders()); }
  else if (tab === 'library') { content.append(rLibrary()); }
  else if (tab === 'favorites') { content.append(rFavorites()); }
  else if (tab === 'settings') { content.append(rSettings()); }
  else if (tab === 'support') { content.append(rSupport()); }
  layout.append(content);
  w.append(layout);
  return w;
}

function rSettings() {
  const w = el('div', {});
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'Настройки'));
  const list = el('div', { class: 'settings-list' });
  [{ i: '🎨', t: 'Тема', d: S.theme === 'light' ? 'Светлая' : 'Тёмная', tg: true, k: 'theme' }, { i: '', t: 'Уведомления', d: S.settings.notif ? 'Вкл' : 'Выкл', tg: true, k: 'notif' }].forEach(it => {
    const row = el('div', { class: 'settings-item' });
    row.append(el('div', { class: 'si-icon' }, it.i), el('div', { class: 'si-info' }, el('strong', {}, it.t), el('span', {}, it.d)));
    if (it.tg) { const isOn = it.k === 'theme' ? S.theme === 'dark' : S.settings[it.k]; const tg = el('div', { class: 'toggle' + (isOn ? ' on' : '') }); tg.addEventListener('click', e => { e.stopPropagation(); if (it.k === 'theme') { S.theme = S.theme === 'light' ? 'dark' : 'light'; } else { S.settings[it.k] = !S.settings[it.k]; } saveSettings(); render(); }); row.append(tg); }
    list.append(row);
  });
  w.append(list);
  return w;
}

function rSettingsSub() {
  const w = el('div', {});
  const sub = (S.route.params && S.route.params.sub) ? S.route.params.sub : '';
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, sub === 'lang' ? 'Язык' : sub === 'about' ? 'О приложении' : sub === 'help' ? 'Помощь' : sub === 'terms' ? 'Условия' : 'Настройки'));
  if (sub === 'lang') { const l = el('div', { class: 'settings-list' }); [['ru', 'Русский', '✓'], ['en', 'English', '']].forEach(x => { l.append(el('div', { class: 'settings-item', onclick: () => { toast('Язык', x[1], 'inf'); nav('settings'); } }, el('div', { class: 'si-info' }, el('strong', {}, x[1])), el('div', { style: 'color: var(--text3);' }, x[2]))); }); w.append(l); }
  else if (sub === 'about') { w.append(el('div', { class: 'section' }, el('p', { style: 'margin-bottom: 10px;' }, el('strong', {}, 'awer'), ' — магазин приложений'), el('p', {}, 'Версия: 1.0.0'))); }
  else if (sub === 'help') { w.append(el('div', { class: 'section' }, el('h3', { style: 'font-size: 14px; font-weight: 500; margin-bottom: 10px;' }, 'Как оставить заявку?'), el('p', { style: 'margin-bottom: 10px;' }, 'Откройте приложение и нажмите «Оставить заявку».'), el('h3', { style: 'font-size: 14px; font-weight: 500; margin: 12px 0 10px;' }, 'Что если обманули?'), el('p', {}, 'Напишите в поддержку.'))); }
  else if (sub === 'terms') { w.append(el('div', { class: 'section' }, el('p', { style: 'margin-bottom: 10px;' }, '1. awer — платформа-посредник.'), el('p', { style: 'margin-bottom: 10px;' }, '2. Оплата в чате между сторонами.'), el('p', {}, '3. Запрещено размещать приложения с вирусами.'))); }
  return w;
}

function rSupport() {
  const w = el('div', {});
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, '🆘 Поддержка'));
  if (!S.cu) { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Войдите'))); return w; }
  const form = el('div', { class: 'section' });
  form.append(el('h3', { style: 'font-size: 15px; font-weight: 500; margin-bottom: 12px;' }, 'Новое обращение'));
  form.append(el('div', { class: 'form-group' }, el('label', {}, 'Тема'), el('input', { class: 'form-control', id: 'sT', placeholder: 'Проблема' })));
  form.append(el('div', { class: 'form-group' }, el('label', {}, 'Описание'), el('textarea', { class: 'form-control', id: 'sX', placeholder: 'Опишите...' })));
  const sb = el('button', { class: 'btn btn-primary' });
  sb.textContent = 'Отправить';
  sb.addEventListener('click', () => { const th = $('#sT').value.trim(), tx = $('#sX').value.trim(); if (!th || !tx) { toast('Заполните поля', '', 'er'); return; } db.collection('supports').add({ userId: S.cu.uid, userName: S.cu.name, theme: th, text: tx, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { toast('Отправлено', '', 'ok'); render(); }); });
  form.append(sb);
  w.append(form);
  return w;
}

function rDeveloper() {
  const w = el('div', {});
  if (!S.cu || S.cu.role !== 'developer') { w.append(el('div', { class: 'empty' }, el('h3', {}, 'Нужен аккаунт разработчика'))); return w; }
  const u = S.cu;
  w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'Консоль разработчика'));
  if (!u.verified && !u.official) { w.append(el('div', { class: 'chat-warning', style: 'margin-bottom: 16px;' }, el('strong', {}, '⚠️ '), 'Аккаунт не верифицирован.')); }
  const stats = el('div', { class: 'stats-grid' });
  db.collection('apps').where('devUid', '==', u.uid).get().then(snap => { stats.append(el('div', { class: 'stat-card' }, el('div', { class: 'stat-label' }, 'Приложения'), el('div', { class: 'stat-value' }, String(snap.size)))); });
  db.collection('orders').where('devUid', '==', u.uid).get().then(snap => { stats.append(el('div', { class: 'stat-card' }, el('div', { class: 'stat-label' }, 'Заявки'), el('div', { class: 'stat-value' }, String(snap.size)))); });
  w.append(stats);
  const tabs = el('div', { style: 'display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px;' });
  const tab = (S.route.params && S.route.params.tab) ? S.route.params.tab : 'apps';
  [['apps', 'Мои приложения'], ['orders', 'Заявки'], ['add', 'Добавить']].forEach(x => { tabs.append(el('div', { class: 'tab-btn' + (tab === x[0] ? ' active' : ''), onclick: () => nav('developer', { tab: x[0] }) }, x[1])); });
  w.append(tabs);
  if (tab === 'apps') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
    w.append(loading);
    db.collection('apps').where('devUid', '==', u.uid).get().then(snap => { loading.remove(); if (snap.empty) { w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет приложений.'))); return; } const list = el('div', { class: 'app-list' }); snap.forEach(doc => { const a = { id: doc.id, ...doc.data() }; const item = rAppListItem(a); if (a.status === 'blocked') item.append(el('span', { style: 'color: var(--error); font-size: 11px;' }, ' Заблокировано')); list.append(item); }); w.append(list); });
  } else if (tab === 'orders') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' }));
    w.append(loading);
    db.collection('orders').where('devUid', '==', u.uid).get().then(snap => { loading.remove(); let has = false; snap.forEach(doc => { const o = { id: doc.id, ...doc.data() }; if (o.status === 'completed' || o.status === 'cancelled') return; has = true; const c = el('div', { class: 'order-card' }); if (o.appIconUrl) { c.append(el('div', { class: 'order-icon' }, el('img', { src: o.appIconUrl }))); } else { c.append(el('div', { class: 'order-icon', style: 'background:' + col(o.appId) }, o.appIcon || '')); } c.append(el('div', { class: 'order-info' }, el('h4', {}, o.appName), el('p', {}, 'Покупатель: ' + (o.buyerName || '—')), el('p', {}, o.paymentMethod))); const ac = el('div', { class: 'order-actions' }); if (o.status === 'new') { const ab = el('button', { class: 'btn btn-primary btn-sm' }); ab.textContent = 'Принять'; ab.addEventListener('click', () => { db.collection('orders').doc(o.id).update({ status: 'accepted' }); toast('Принято', '', 'ok'); }); ac.append(ab); const rb = el('button', { class: 'btn btn-danger btn-sm' }); rb.textContent = 'Отклонить'; rb.addEventListener('click', () => { if (!confirm('Отклонить?')) return; db.collection('orders').doc(o.id).update({ status: 'cancelled' }); render(); }); ac.append(rb); } const cb = el('button', { class: 'btn btn-outline btn-sm' }); cb.textContent = 'Чат'; cb.addEventListener('click', () => { nav('chat', { orderId: o.id }); }); ac.append(cb); c.append(ac); w.append(c); }); if (!has) w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет заявок'))); });
  } else if (tab === 'add') { w.append(rAddApp()); }
  return w;
}

function rAddApp() {
  const f = el('div', { class: 'section' });
  f.append(el('h3', { style: 'font-size: 15px; font-weight: 500; margin-bottom: 12px;' }, 'Новое приложение'));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Название *'), el('input', { class: 'form-control', id: 'f_name', placeholder: 'Название' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Описание *'), el('textarea', { class: 'form-control', id: 'f_desc', placeholder: 'Описание...' })));
  const g3 = el('div', { class: 'form-group' }); g3.append(el('label', {}, 'Категория *')); const sel = el('select', { class: 'form-control', id: 'f_cat' }); CATS.forEach(c => { sel.append(el('option', { value: c.id }, c.i + ' ' + c.n)); }); g3.append(sel); f.append(g3);
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Цена (0 = бесплатно)'), el('input', { class: 'form-control', id: 'f_price', type: 'number', value: '0', min: '0' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Версия'), el('input', { class: 'form-control', id: 'f_ver', value: '1.0.0' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Иконка (эмодзи)'), el('input', { class: 'form-control', id: 'f_icon', value: '🚀', maxlength: '2' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Иконка (файл)'), el('input', { type: 'file', id: 'f_iconFile', accept: 'image/*' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Ссылка на файл'), el('input', { class: 'form-control', id: 'f_fileUrl', placeholder: 'https://drive.google.com/...' })));
  f.append(el('div', { class: 'form-group' }, el('label', {}, 'Имя файла'), el('input', { class: 'form-control', id: 'f_fileName', placeholder: 'app.zip' })));
  const gs = el('div', { class: 'form-group' }); gs.append(el('label', {}, 'Скриншоты (до 10)'));
  const ssWrap = el('div', {}); const ssInput = el('input', { type: 'file', id: 'f_screenshots', accept: 'image/*', multiple: 'multiple' }); ssWrap.append(ssInput);
  const ssProgress = el('div', { style: 'display: none; margin-top: 6px;' }); ssProgress.append(el('div', { style: 'height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;' }, el('div', { style: 'height: 100%; background: var(--primary); width: 0;', id: 'ssProgFill' }))); ssProgress.append(el('div', { style: 'font-size: 10px; color: var(--text3); margin-top: 3px;', id: 'ssProgText' }, 'Обработка...')); ssWrap.append(ssProgress);
  const ssPreview = el('div', { class: 'screenshots-preview', id: 'ssPreview' }); ssWrap.append(ssPreview); gs.append(ssWrap); f.append(gs);
  let pendingScreenshots = [];
  ssInput.addEventListener('change', function(e) { const files = Array.from(e.target.files || []); if (files.length === 0) return; if (pendingScreenshots.length + files.length > 10) { toast('Максимум 10', '', 'er'); ssInput.value = ''; return; } ssProgress.style.display = 'block'; let processed = 0; const total = files.length; function processNext() { if (processed >= total) { ssProgress.style.display = 'none'; ssInput.value = ''; renderSSPreview(); toast('Добавлены', total + ' шт.', 'ok'); return; } const file = files[processed]; $('#ssProgText').textContent = 'Обработка ' + (processed + 1) + ' из ' + total; $('#ssProgFill').style.width = Math.round((processed / total) * 100) + '%'; compressImage(file, 800).then(result => { uploadToImgBB(result.blob).then(url => { pendingScreenshots.push({ url: url, name: file.name, size: result.blob.size }); processed++; processNext(); }).catch(() => { toast('Ошибка', file.name, 'er'); processed++; processNext(); }); }).catch(() => { processed++; processNext(); }); } processNext(); });
  function renderSSPreview() { ssPreview.innerHTML = ''; pendingScreenshots.forEach((sh, idx) => { const thumb = el('div', { class: 'screenshot-thumb' }); thumb.append(el('img', { src: sh.url })); const rm = el('div', { class: 'remove' }); rm.textContent = '✕'; rm.addEventListener('click', () => { pendingScreenshots.splice(idx, 1); renderSSPreview(); }); thumb.append(rm); ssPreview.append(thumb); }); }
  const pubBtn = el('button', { class: 'btn btn-primary', style: 'margin-top: 12px;' }); pubBtn.textContent = 'Опубликовать';
  pubBtn.addEventListener('click', () => { const name = $('#f_name').value.trim(); const desc = $('#f_desc').value.trim(); if (!name) { toast('Введите название', '', 'er'); return; } if (!desc) { toast('Введите описание', '', 'er'); return; } pubBtn.disabled = true; pubBtn.textContent = 'Публикация...'; const iconFileEl = $('#f_iconFile'); const iconFile = iconFileEl && iconFileEl.files ? iconFileEl.files[0] : null; let iconPromise = Promise.resolve(null); if (iconFile) { iconPromise = compressImage(iconFile, 200).then(r => uploadToImgBB(r.blob)); } iconPromise.then(iconUrl => { const appData = { name, desc, cat: $('#f_cat').value, price: parseInt($('#f_price').value) || 0, ver: $('#f_ver').value.trim() || '1.0.0', icon: $('#f_icon').value.trim() || '', iconUrl: iconUrl || null, fileUrl: $('#f_fileUrl').value.trim(), fileName: $('#f_fileName').value.trim(), devUid: S.cu.uid, devName: S.cu.name, devVerified: S.cu.verified || false, official: S.cu.official || false, installs: 0, rating: 0, reviews: 0, status: 'verified', screenshots: pendingScreenshots.slice(), createdAt: firebase.firestore.FieldValue.serverTimestamp() }; db.collection('apps').add(appData).then(() => { pubBtn.disabled = false; pubBtn.textContent = 'Опубликовать'; pendingScreenshots = []; toast('✓ Опубликовано', '', 'ok'); nav('developer', { tab: 'apps' }); }).catch(e => { pubBtn.disabled = false; pubBtn.textContent = 'Опубликовать'; toast('Ошибка', e.message, 'er'); }); }).catch(e => { pubBtn.disabled = false; pubBtn.textContent = 'Опубликовать'; toast('Ошибка', e.message, 'er'); }); });
  f.append(pubBtn);
  return f;
}

function rAdmin() {
  const w = el('div', {});
  if (!S.cu || !S.cu.isAdmin || !S.cu.isFirstDeveloper) { w.append(el('div', { class: 'empty' }, el('div', { class: 'empty-icon' }, '🔐'), el('h3', {}, 'Доступ запрещён'), el('p', {}, 'Этот раздел доступен только создателю аккаунта разработчика.'), el('p', { style: 'font-size: 12px; color: var(--text3); margin-top: 8px;' }, 'Если вы создали первый аккаунт разработчика, войдите под этим аккаунтом.'))); return w; }
  w.append(el('div', { class: 'admin-panel' }, el('div', { class: 'admin-header' }, el('h2', {}, '⚙️ Админ-панель'), el('span', { class: 'admin-badge' }, 'SUPER ADMIN'))));
  const stats = el('div', { class: 'admin-stats' });
  Promise.all([db.collection('users').get(), db.collection('apps').get(), db.collection('orders').get(), db.collection('supports').get(), db.collection('reports').get()]).then(([usersSnap, appsSnap, ordersSnap, supportsSnap, reportsSnap]) => { stats.append(el('div', { class: 'admin-stat-card' }, el('div', { class: 'label' }, 'Пользователи'), el('div', { class: 'value' }, String(usersSnap.size)))); stats.append(el('div', { class: 'admin-stat-card' }, el('div', { class: 'label' }, 'Приложения'), el('div', { class: 'value' }, String(appsSnap.size)))); stats.append(el('div', { class: 'admin-stat-card' }, el('div', { class: 'label' }, 'Заявки'), el('div', { class: 'value' }, String(ordersSnap.size)))); stats.append(el('div', { class: 'admin-stat-card' }, el('div', { class: 'label' }, 'Обращения'), el('div', { class: 'value' }, String(supportsSnap.size)))); stats.append(el('div', { class: 'admin-stat-card' }, el('div', { class: 'label' }, 'Жалобы'), el('div', { class: 'value' }, String(reportsSnap.size)))); });
  w.append(stats);
  const tabs = el('div', { style: 'display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px;' });
  const tab = (S.route.params && S.route.params.tab) ? S.route.params.tab : 'apps';
  [['apps', 'Приложения'], ['users', 'Пользователи'], ['orders', 'Заявки'], ['supports', 'Обращения'], ['reports', 'Жалобы'], ['site', '⚙️ Сайт']].forEach(x => { tabs.append(el('div', { class: 'tab-btn' + (tab === x[0] ? ' active' : ''), onclick: () => nav('admin', { tab: x[0] }) }, x[1])); });
  w.append(tabs);
  if (tab === 'apps') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' })); w.append(loading);
    db.collection('apps').orderBy('createdAt', 'desc').get().then(snap => { loading.remove(); if (snap.empty) { w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет приложений'))); return; } const table = el('table', { class: 'admin-table' }); table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Приложение'), el('th', {}, 'Разработчик'), el('th', {}, 'Статус'), el('th', {}, 'Действия')))); const tbody = el('tbody', {}); snap.forEach(doc => { const a = { id: doc.id, ...doc.data() }; const tr = el('tr', {}); tr.append(el('td', {}, a.name)); tr.append(el('td', {}, a.devName || '—')); tr.append(el('td', {}, el('span', { style: 'padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ' + (a.status === 'verified' ? 'rgba(129,201,149,.2); color: #81c995;' : a.status === 'blocked' ? 'rgba(242,139,130,.2); color: #f28b82;' : 'rgba(253,214,99,.2); color: #fdd663;') }, a.status === 'verified' ? '✓ Одобрено' : a.status === 'blocked' ? '✕ Заблокировано' : '⏳ На модерации'))); const actions = el('td', {}, el('div', { class: 'admin-actions' })); if (a.status !== 'verified') { actions.children[0].append(el('button', { class: 'admin-btn admin-btn-approve', onclick: () => { db.collection('apps').doc(a.id).update({ status: 'verified' }); toast('Одобрено', '', 'ok'); render(); } }, '✓')); } if (a.status !== 'blocked') { actions.children[0].append(el('button', { class: 'admin-btn admin-btn-block', onclick: () => { db.collection('apps').doc(a.id).update({ status: 'blocked' }); toast('Заблокировано', '', 'er'); render(); } }, '✕')); } actions.children[0].append(el('button', { class: 'admin-btn admin-btn-delete', onclick: () => { if (confirm('Удалить приложение?')) { db.collection('apps').doc(a.id).delete(); render(); } } }, '🗑')); tr.append(actions); tbody.append(tr); }); table.append(tbody); w.append(table); });
  } else if (tab === 'users') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' })); w.append(loading);
    db.collection('users').get().then(snap => { loading.remove(); const table = el('table', { class: 'admin-table' }); table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Пользователь'), el('th', {}, 'Роль'), el('th', {}, 'Статус'), el('th', {}, 'Действия')))); const tbody = el('tbody', {}); snap.forEach(doc => { const u = { uid: doc.id, ...doc.data() }; const tr = el('tr', {}); tr.append(el('td', {}, u.name + (u.isAdmin ? ' 👑' : ''))); tr.append(el('td', {}, u.role === 'developer' ? 'Разработчик' : 'Покупатель')); tr.append(el('td', {}, el('span', { style: 'padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ' + (u.blocked ? 'rgba(242,139,130,.2); color: #f28b82;' : 'rgba(129,201,149,.2); color: #81c995;') }, u.blocked ? 'Заблокирован' : 'Активен'))); const actions = el('td', {}, el('div', { class: 'admin-actions' })); if (u.uid !== S.cu.uid) { actions.children[0].append(el('button', { class: 'admin-btn ' + (u.blocked ? 'admin-btn-approve' : 'admin-btn-block'), onclick: () => { db.collection('users').doc(u.uid).update({ blocked: !u.blocked }); toast(u.blocked ? 'Разблокирован' : 'Заблокирован', '', 'inf'); render(); } }, u.blocked ? 'Разблок' : 'Блок')); } tr.append(actions); tbody.append(tr); }); table.append(tbody); w.append(table); });
  } else if (tab === 'orders') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' })); w.append(loading);
    db.collection('orders').orderBy('createdAt', 'desc').get().then(snap => { loading.remove(); if (snap.empty) { w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет заявок'))); return; } const table = el('table', { class: 'admin-table' }); table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Приложение'), el('th', {}, 'Покупатель'), el('th', {}, 'Продавец'), el('th', {}, 'Статус')))); const tbody = el('tbody', {}); snap.forEach(doc => { const o = { id: doc.id, ...doc.data() }; const tr = el('tr', {}); tr.append(el('td', {}, o.appName)); tr.append(el('td', {}, o.buyerName || '—')); tr.append(el('td', {}, o.devName || '—')); tr.append(el('td', {}, el('span', { style: 'padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ' + (o.status === 'completed' ? 'rgba(129,201,149,.2); color: #81c995;' : o.status === 'cancelled' ? 'rgba(242,139,130,.2); color: #f28b82;' : 'rgba(138,180,248,.2); color: #8ab4f8;') }, o.status === 'completed' ? '✓ Завершена' : o.status === 'cancelled' ? '✕ Отменена' : ' В процессе'))); tbody.append(tr); }); table.append(tbody); w.append(table); });
  } else if (tab === 'supports') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' })); w.append(loading);
    db.collection('supports').orderBy('createdAt', 'desc').get().then(snap => { loading.remove(); if (snap.empty) { w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет обращений'))); return; } const table = el('table', { class: 'admin-table' }); table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Тема'), el('th', {}, 'Пользователь'), el('th', {}, 'Статус'), el('th', {}, 'Действия')))); const tbody = el('tbody', {}); snap.forEach(doc => { const s = { id: doc.id, ...doc.data() }; const tr = el('tr', {}); tr.append(el('td', {}, s.theme)); tr.append(el('td', {}, s.userName || '—')); tr.append(el('td', {}, el('span', { style: 'padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ' + (s.status === 'new' ? 'rgba(253,214,99,.2); color: #fdd663;' : 'rgba(129,201,149,.2); color: #81c995;') }, s.status === 'new' ? '🆕 Новое' : '✓ Отвечено'))); const actions = el('td', {}, el('div', { class: 'admin-actions' })); actions.children[0].append(el('button', { class: 'admin-btn admin-btn-view', onclick: () => openAdminSupport(doc.id) }, 'Открыть')); tr.append(actions); tbody.append(tr); }); table.append(tbody); w.append(table); });
  } else if (tab === 'reports') {
    const loading = el('div', { class: 'loading-spinner' }, el('div', { class: 'spinner' })); w.append(loading);
    db.collection('reports').get().then(snap => { loading.remove(); if (snap.empty) { w.append(el('div', { class: 'empty' }, el('p', {}, 'Нет жалоб'))); return; } const table = el('table', { class: 'admin-table' }); table.append(el('thead', {}, el('tr', {}, el('th', {}, 'Приложение'), el('th', {}, 'Причина'), el('th', {}, 'Статус'), el('th', {}, 'Действия')))); const tbody = el('tbody', {}); snap.forEach(doc => { const rp = { id: doc.id, ...doc.data() }; const tr = el('tr', {}); tr.append(el('td', {}, rp.appName || '—')); tr.append(el('td', {}, rp.reason)); tr.append(el('td', {}, el('span', { style: 'padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ' + (!rp.resolved ? 'rgba(253,214,99,.2); color: #fdd663;' : 'rgba(129,201,149,.2); color: #81c995;') }, !rp.resolved ? '⏳ На рассмотрении' : '✓ Решено'))); const actions = el('td', {}, el('div', { class: 'admin-actions' })); if (!rp.resolved) { actions.children[0].append(el('button', { class: 'admin-btn admin-btn-block', onclick: () => { db.collection('apps').doc(rp.appId).update({ status: 'blocked' }); db.collection('reports').doc(doc.id).update({ resolved: 'blocked' }); toast('Приложение заблокировано', '', 'er'); render(); } }, 'Блок')); actions.children[0].append(el('button', { class: 'admin-btn admin-btn-delete', onclick: () => { db.collection('reports').doc(doc.id).update({ resolved: 'rejected' }); toast('Жалоба отклонена', '', 'inf'); render(); } }, 'Отклонить')); } tr.append(actions); tbody.append(tr); }); table.append(tbody); w.append(table); });
  } else if (tab === 'site') {
    // ИСПРАВЛЕНИЕ: ПРОСТОЕ УПРАВЛЕНИЕ БЕЗ ГЛЮЧНЫХ ПОЛЕЙ ВВОДА
    const siteSection = el('div', { class: 'admin-section' });
    siteSection.append(el('h3', {}, '️ Управление сайтом'));
    const statusDiv = el('div', { style: 'padding: 20px; background: var(--bg3); border-radius: var(--radius2); margin-bottom: 20px; text-align: center;' });
    statusDiv.textContent = 'Загрузка статуса...';
    siteSection.append(statusDiv);
    const buttonsDiv = el('div', { style: 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;' });
    const closeBtn = el('button', { class: 'btn btn-danger', style: 'padding: 16px 32px; font-size: 16px; font-weight: 600;' });
    closeBtn.textContent = '🔒 Закрыть сайт (на 1 час)';
    closeBtn.addEventListener('click', () => {
      if (!confirm('Закрыть сайт для всех пользователей?\n\nАдмины и разработчики продолжат видеть сайт.')) return;
      const endTime = new Date(Date.now() + 60 * 60 * 1000);
      maintenanceRef.set({ enabled: true, message: 'Технические работы. Скоро вернёмся!', endTime: firebase.firestore.Timestamp.fromDate(endTime), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), setBy: S.cu.uid }).then(() => { toast('Сайт закрыт', 'Откроется через 1 час', 'ok'); render(); }).catch(e => { toast('Ошибка', e.message, 'er'); });
    });
    buttonsDiv.append(closeBtn);
    const openBtn = el('button', { class: 'btn btn-primary', style: 'padding: 16px 32px; font-size: 16px; font-weight: 600;' });
    openBtn.textContent = '🔓 Открыть сайт сейчас';
    openBtn.addEventListener('click', () => {
      if (!confirm('Открыть сайт для всех пользователей?')) return;
      maintenanceRef.update({ enabled: false }).then(() => { toast('Сайт открыт', '', 'ok'); render(); }).catch(e => { toast('Ошибка', e.message, 'er'); });
    });
    buttonsDiv.append(openBtn);
    siteSection.append(buttonsDiv);
    maintenanceRef.onSnapshot(function(doc) {
      if (!doc.exists) { statusDiv.innerHTML = '<div style="color: var(--primary); font-weight: 600; font-size: 16px;">✅ Сайт открыт</div><div style="font-size: 12px; color: var(--text3); margin-top: 8px;">Все пользователи имеют доступ</div>'; return; }
      const data = doc.data();
      if (data.enabled) { const endTime = data.endTime ? data.endTime.toDate().toLocaleString('ru-RU') : 'не указано'; statusDiv.innerHTML = '<div style="color: var(--error); font-weight: 600; font-size: 16px; margin-bottom: 8px;">🔒 Сайт ЗАКРЫТ</div><div style="font-size: 13px; color: var(--text2); margin-bottom: 4px;">Сообщение: ' + (data.message || '—') + '</div><div style="font-size: 13px; color: var(--text2);">Откроется: ' + endTime + '</div>'; }
      else { statusDiv.innerHTML = '<div style="color: var(--primary); font-weight: 600; font-size: 16px;">✅ Сайт открыт</div><div style="font-size: 12px; color: var(--text3); margin-top: 8px;">Все пользователи имеют доступ</div>'; }
    });
    w.append(siteSection);
  }
  return w;
}

function openAdminSupport(id) {
  const m = el('div', {});
  m.append(el('div', { class: 'modal-head' }, el('h2', {}, '💬 Обращение'), el('div', { class: 'modal-close', onclick: closeM }, '✕')));
  const body = el('div', { class: 'modal-body' });
  db.collection('supports').doc(id).get().then(doc => {
    if (!doc.exists) return;
    const s = doc.data();
    body.append(el('p', { style: 'font-weight: 500;' }, s.theme));
    body.append(el('p', { style: 'color: var(--text2); font-size: 13px; margin-bottom: 14px;' }, s.text));
    const ms = el('div', { class: 'chat-messages', style: 'min-height: 200px; max-height: 300px;' });
    db.collection('supports').doc(id).collection('messages').orderBy('createdAt', 'asc').get().then(snapshot => {
      snapshot.forEach(d => { const x = d.data(); ms.append(el('div', { class: 'msg ' + (x.from === 'support' ? 'me' : 'other') }, el('div', {}, x.text), el('span', { class: 'msg-time' }, ft(x.createdAt)))); });
      body.append(ms);
      const inp = el('div', { class: 'chat-input-row' }); const input = el('input', { placeholder: 'Ответить...' });
      const sendBtn = el('button', { class: 'btn btn-primary' }); sendBtn.textContent = 'Ответить';
      sendBtn.addEventListener('click', () => { const t = input.value.trim(); if (!t) return; db.collection('supports').doc(id).collection('messages').add({ from: 'support', text: t, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); db.collection('supports').doc(id).update({ status: 'answered' }); closeM(); render(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });
      inp.append(input, sendBtn); body.append(inp);
      if (s.orderId) { const acts = el('div', { style: 'display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;' }); const returnBtn = el('button', { class: 'btn btn-primary btn-sm' }); returnBtn.textContent = '✓ Вернуть'; returnBtn.addEventListener('click', () => { db.collection('orders').doc(s.orderId).get().then(od => { if (!od.exists) return; const o = od.data(); const lib = JSON.parse(localStorage.getItem('awl_' + o.buyerUid) || '{}'); lib[o.appId] = { date: Date.now() }; localStorage.setItem('awl_' + o.buyerUid, JSON.stringify(lib)); db.collection('supports').doc(id).collection('messages').add({ from: 'support', text: 'Приложение возвращено.', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); closeM(); render(); toast('Возвращено', '', 'ok'); }); }); acts.append(returnBtn); const cancelBtn = el('button', { class: 'btn btn-danger btn-sm' }); cancelBtn.textContent = '✕ Отменить'; cancelBtn.addEventListener('click', () => { db.collection('orders').doc(s.orderId).update({ status: 'cancelled' }); db.collection('supports').doc(id).collection('messages').add({ from: 'support', text: 'Сделка отменена.', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); closeM(); render(); }); acts.append(cancelBtn); body.append(acts); }
      m.append(body); openM(m);
    });
  });
}

function rTutorial() {
  const w = el('div', { class: 'tutorial-container' });
  w.append(el('div', { class: 'tutorial-header' }, el('h1', {}, '📚 Как опубликовать приложение'), el('p', {}, 'Пошаговое руководство по публикации вашего приложения или игры на платформе awer')));
  const steps = [
    { n: 1, t: 'Регистрация аккаунта разработчика', d: 'Сначала нужно создать аккаунт и выбрать роль "Разработчик". Нажмите кнопку "Войти" в правом верхнем углу, затем "Зарегистрироваться". Введите уникальный ник (минимум 3 символа) и выберите тип аккаунта "Разработчик".', p: ' Скриншот формы регистрации с выбором роли "Разработчик"', tip: 'Ник должен быть уникальным. Если ник занят, система предложит выбрать другой. После регистрации вы автоматически войдёте в аккаунт.' },
    { n: 2, t: 'Вход в консоль разработчика', d: 'После регистрации нажмите на свой аватар в правом верхнем углу, чтобы перейти в профиль. В меню профиля выберите "Консоль разработчика". Здесь вы увидите статистику ваших приложений и заявок.', p: ' Скриншот профиля с кнопкой "Консоль разработчика"', tip: 'Если вы не видите кнопку "Консоль разработчика", убедитесь, что при регистрации выбрали роль "Разработчик".' },
    { n: 3, t: 'Нажатие кнопки "Добавить"', d: 'В консоли разработчика перейдите на вкладку "Добавить" (третья вкладка вверху). Здесь откроется форма для создания нового приложения. Все поля со звёздочкой (*) обязательны для заполнения.', p: '➕ Скриншот консоли разработчика с выделенной вкладкой "Добавить"', tip: 'Вы можете иметь неограниченное количество приложений.' },
    { n: 4, t: 'Заполнение основной информации', d: 'Заполните название приложения (обязательно), подробное описание (обязательно), выберите категорию из списка и укажите цену. Если приложение бесплатное, оставьте цену 0.', p: '📋 Скриншот формы с полями: Название, Описание, Категория, Цена', tip: 'Название должно быть кратким и запоминающимся (до 30 символов). Хорошее описание увеличивает количество скачиваний!' },
    { n: 5, t: 'Загрузка иконки приложения', d: 'Загрузите иконку вашего приложения. Можно использовать эмодзи (например, 🚀) или загрузить изображение. Рекомендуемый размер иконки: 512x512 пикселей.', p: '🖼️ Скриншот поля загрузки иконки с примером красивой иконки', tip: 'Иконка — это первое, что видят пользователи. Сделайте её яркой и запоминающейся.' },
    { n: 6, t: 'Добавление скриншотов', d: 'Загрузите до 10 скриншотов вашего приложения. Скриншоты автоматически сжимаются для быстрой загрузки. Рекомендуемое соотношение сторон: 9:16.', p: '📸 Скриншот раздела загрузки скриншотов с превью изображений', tip: 'Первый скриншот самый важный — он отображается в каталоге.' },
    { n: 7, t: 'Указание ссылки на файл', d: 'Вставьте прямую ссылку на файл приложения (APK, ZIP, EXE и т.д.). Можно использовать Google Drive, Dropbox, свой сервер или любой другой хостинг.', p: '🔗 Скриншот полей "Ссылка на файл" и "Имя файла"', tip: 'Убедитесь, что ссылка публичная и не требует авторизации для скачивания.' },
    { n: 8, t: 'Публикация приложения', d: 'Проверьте все заполненные поля и нажмите кнопку "Опубликовать" внизу формы. Ваше приложение будет добавлено в каталог и станет доступно всем пользователям.', p: '✅ Скриншот кнопки "Опубликовать" и успешного уведомления', tip: 'После публикации приложение сразу появляется в каталоге.' }
  ];
  steps.forEach(s => { const se = el('div', { class: 'tutorial-step' }); se.append(el('div', { class: 'tutorial-step-header' }, el('div', { class: 'tutorial-step-number' }, String(s.n)), el('div', { class: 'tutorial-step-title' }, s.t))); se.append(el('div', { class: 'tutorial-step-description' }, s.d)); se.append(el('div', { class: 'tutorial-step-image' }, el('div', { class: 'tutorial-step-placeholder' }, s.p))); se.append(el('div', { class: 'tutorial-step-tips' }, el('strong', {}, '💡 Совет'), el('p', {}, s.tip))); w.append(se); });
  const nav = el('div', { class: 'tutorial-nav' });
  nav.append(el('button', { class: 'tutorial-nav-btn', onclick: () => nav('home') }, '← На главную'));
  if (!S.cu) { nav.append(el('button', { class: 'tutorial-nav-btn primary', onclick: () => showAuth() }, 'Зарегистрироваться')); }
  else if (S.cu.role === 'developer') { nav.append(el('button', { class: 'tutorial-nav-btn primary', onclick: () => nav('developer', { tab: 'add' }) }, 'Опубликовать приложение →')); }
  else { nav.append(el('button', { class: 'tutorial-nav-btn primary', onclick: () => nav('profile') }, 'Перейти в профиль')); }
  w.append(nav);
  return w;
}

function rAbout() { const w = el('div', {}); w.append(el('h1', { style: 'font-size: 20px; font-weight: 500; margin-bottom: 16px;' }, 'О awer')); w.append(el('div', { class: 'section' }, el('p', { style: 'margin-bottom: 10px;' }, 'awer — магазин приложений и игр.'), el('p', { style: 'margin-bottom: 10px;' }, 'Оплата НЕ в awer — она в чате с продавцом.'), el('p', { style: 'color: var(--error); font-weight: 500; margin-top: 12px;' }, '🚫 ЗАПРЕЩЕНО выкладывать приложения с вирусами.'))); return w; }

// ============================================
// MODALS
// ============================================
function showAuth() {
  const m = el('div', {});
  const head = el('div', { class: 'modal-head' }, el('h2', {}, 'Войти в awer'), el('div', { class: 'modal-close', onclick: closeM }, '✕'));
  const body = el('div', { class: 'modal-body' });
  let mode = 'login';
  function rf() {
    body.innerHTML = '';
    if (mode === 'login') {
      body.append(el('div', { class: 'form-group' }, el('label', {}, 'Ник'), el('input', { class: 'form-control', id: 'aNick', placeholder: 'Ваш ник' })));
      const loginBtn = el('button', { class: 'btn btn-primary btn-full' });
      loginBtn.textContent = 'Войти';
      loginBtn.addEventListener('click', () => { const nick = $('#aNick').value.trim(); if (!nick) { toast('Введите ник', '', 'er'); return; } loginWithNick(nick).then(result => { S.cu = result; localStorage.setItem('awn', nick); saveSettings(); closeM(); render(); updateAuthBtn(); toast('Добро пожаловать!', nick, 'ok'); }).catch(err => { toast('Ошибка', err.message, 'er'); }); });
      body.append(loginBtn);
      body.append(el('p', { style: 'text-align: center; font-size: 12px; color: var(--text3); margin-top: 12px;' }, 'Нет аккаунта? ', el('span', { style: 'color: var(--primary); cursor: pointer; font-weight: 500;', onclick: () => { mode = 'register'; rf(); } }, 'Зарегистрироваться')));
    } else {
      body.append(el('div', { class: 'form-group' }, el('label', {}, 'Ник'), el('input', { class: 'form-control', id: 'rNick', placeholder: 'Придумайте ник' })));
      body.append(el('div', { class: 'form-group' }, el('label', {}, 'Тип аккаунта')));
      const rg = el('div', { class: 'radio-group' });
      [['buyer', 'Покупатель'], ['developer', 'Разработчик']].forEach((x, idx) => { const it = el('div', { class: 'radio-item' + (idx === 0 ? ' selected' : ''), 'data-val': x[0] }); it.addEventListener('click', () => { $$('.radio-item', rg).forEach(y => { y.classList.remove('selected'); }); it.classList.add('selected'); }); it.append(el('div', { class: 'radio-dot' }), el('div', { style: 'flex: 1;' }, el('strong', {}, x[1]))); rg.append(it); });
      body.append(rg);
      const regBtn = el('button', { class: 'btn btn-primary btn-full', style: 'margin-top: 12px;' });
      regBtn.textContent = 'Зарегистрироваться';
      regBtn.addEventListener('click', () => { const nick = $('#rNick').value.trim(); const roleEl = $('.radio-item.selected', rg); const role = roleEl ? roleEl.getAttribute('data-val') : 'buyer'; if (!nick) { toast('Введите ник', '', 'er'); return; } if (nick.length < 3) { toast('Ник минимум 3 символа', '', 'er'); return; } registerWithNick(nick, role).then(result => { S.cu = result; localStorage.setItem('awn', nick); saveSettings(); closeM(); render(); updateAuthBtn(); toast('Аккаунт создан!', nick, 'ok'); }).catch(err => { toast('Ошибка', err.message, 'er'); }); });
      body.append(regBtn);
      body.append(el('p', { style: 'text-align: center; font-size: 12px; color: var(--text3); margin-top: 12px;' }, 'Есть аккаунт? ', el('span', { style: 'color: var(--primary); cursor: pointer; font-weight: 500;', onclick: () => { mode = 'login'; rf(); } }, 'Войти')));
    }
  }
  rf();
  m.append(head, body);
  openM(m);
}

function openOrder(appId) {
  if (!S.cu) { showAuth(); return; }
  getAppById(appId, function(a) {
    if (!a) return;
    const m = el('div', {});
    m.append(el('div', { class: 'modal-head' }, el('h2', {}, 'Заявка'), el('div', { class: 'modal-close', onclick: closeM }, '✕')));
    const body = el('div', { class: 'modal-body' });
    body.append(el('div', { style: 'display: flex; gap: 12px; align-items: center; padding: 12px; background: var(--bg3); border-radius: var(--radius2); margin-bottom: 16px;' }, a.iconUrl ? el('div', { class: 'order-icon', style: 'width: 56px; height: 56px; border-radius: 12px;' }, el('img', { src: a.iconUrl })) : el('div', { class: 'order-icon', style: 'width: 56px; height: 56px; border-radius: 12px; background:' + col(a.id) }, a.icon || ''), el('div', { style: 'flex: 1;' }, el('strong', { style: 'font-size: 14px;' }, a.name), el('div', { style: 'font-size: 11px; color: var(--text3); margin-top: 2px;' }, 'Продавец: ' + (a.devName || '—'), a.official ? el('span', { style: 'color: #ffd700;' }, '🏆') : null), el('div', { style: 'font-weight: 600; margin-top: 2px; color: var(--primary);' }, fp(a.price || 0)))));
    body.append(el('h3', { style: 'font-size: 13px; font-weight: 500; margin-bottom: 10px;' }, 'Способ оплаты'));
    const rg = el('div', { class: 'radio-group' });
    [['bank', 'Банковский перевод'], ['other', 'Другой способ'], ['discuss', 'Обсудить в чате']].forEach((x, idx) => { const it = el('div', { class: 'radio-item' + (idx === 0 ? ' selected' : ''), 'data-val': x[0] }); it.addEventListener('click', () => { $$('.radio-item', rg).forEach(y => { y.classList.remove('selected'); }); it.classList.add('selected'); }); it.append(el('div', { class: 'radio-dot' }), el('div', { style: 'flex: 1;' }, el('strong', {}, x[1]))); rg.append(it); });
    body.append(rg);
    body.append(el('div', { class: 'chat-warning', style: 'margin-top: 12px;' }, el('strong', {}, '⚠️ '), 'awer не принимает платежи.'));
    const foot = el('div', { class: 'modal-foot' });
    foot.append(el('button', { class: 'btn btn-outline', onclick: closeM }, 'Отмена'));
    const submitBtn = el('button', { class: 'btn btn-primary' });
    submitBtn.textContent = 'Отправить';
    submitBtn.addEventListener('click', () => { const methodEl = $('.radio-item.selected', rg); const method = methodEl ? methodEl.getAttribute('data-val') : ''; if (!method) { toast('Выберите способ', '', 'er'); return; } const names = { bank: 'Банковский перевод', other: 'Другой способ', discuss: 'Обсудить в чате' }; db.collection('orders').add({ appId: a.id, appName: a.name, appIcon: a.icon, appIconUrl: a.iconUrl, buyerUid: S.cu.uid, buyerName: S.cu.name, devUid: a.devUid, devName: a.devName, paymentMethod: names[method], status: 'new', price: a.price || 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { closeM(); toast('Отправлено', '', 'ok'); nav('orders'); }); });
    foot.append(submitBtn);
    m.append(body, foot);
    openM(m);
  });
}

function openReport(appId) {
  if (!S.cu) { showAuth(); return; }
  getAppById(appId, function(a) {
    if (!a) return;
    const m = el('div', {});
    m.append(el('div', { class: 'modal-head' }, el('h2', {}, 'Пожаловаться'), el('div', { class: 'modal-close', onclick: closeM }, '✕')));
    const body = el('div', { class: 'modal-body' });
    body.append(el('p', { style: 'margin-bottom: 12px; font-size: 13px;' }, 'Приложение: ', el('strong', {}, a.name)));
    const rg = el('div', { class: 'radio-group' });
    ['Вирусы', 'Обман', 'Подделка', 'Нарушение правил', 'Другое'].forEach((r, idx) => { const it = el('div', { class: 'radio-item' + (idx === 0 ? ' selected' : ''), 'data-val': r }); it.addEventListener('click', () => { $$('.radio-item', rg).forEach(y => { y.classList.remove('selected'); }); it.classList.add('selected'); }); it.append(el('div', { class: 'radio-dot' }), el('div', { style: 'flex: 1;' }, el('strong', {}, r))); rg.append(it); });
    body.append(rg);
    const foot = el('div', { class: 'modal-foot' });
    foot.append(el('button', { class: 'btn btn-outline', onclick: closeM }, 'Отмена'));
    const submitBtn = el('button', { class: 'btn btn-danger' });
    submitBtn.textContent = 'Отправить';
    submitBtn.addEventListener('click', () => { const reasonEl = $('.radio-item.selected', rg); const reason = reasonEl ? reasonEl.getAttribute('data-val') : ''; if (!reason) { toast('Выберите причину', '', 'er'); return; } db.collection('reports').add({ appId: a.id, appName: a.name, appIcon: a.icon, userId: S.cu.uid, reason: reason, resolved: null, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { closeM(); toast('Отправлено', '', 'ok'); }); });
    foot.append(submitBtn);
    m.append(body, foot);
    openM(m);
  });
}

function openScreenshotViewer(screenshots, currentSh) {
  let idx = -1;
  for (let i = 0; i < screenshots.length; i++) { if (screenshots[i].url === currentSh.url) { idx = i; break; } }
  if (idx < 0) idx = 0;
  const m = el('div', {});
  m.append(el('div', { class: 'modal-head' }, el('h2', {}, 'Скриншот ' + (idx + 1) + ' из ' + screenshots.length), el('div', { class: 'modal-close', onclick: closeM }, '')));
  const body = el('div', { class: 'modal-body' });
  const imgWrap = el('div', { style: 'text-align: center; min-height: 300px; display: flex; align-items: center; justify-content: center; background: var(--bg3); border-radius: var(--radius2); overflow: hidden;' });
  body.append(imgWrap);
  const nav = el('div', { style: 'display: flex; gap: 6px; justify-content: center; margin-top: 10px;' });
  const prevBtn = el('button', { class: 'btn btn-outline btn-sm' });
  prevBtn.textContent = '← Назад';
  prevBtn.addEventListener('click', () => { idx = (idx - 1 + screenshots.length) % screenshots.length; show(); });
  nav.append(prevBtn);
  const nextBtn = el('button', { class: 'btn btn-outline btn-sm' });
  nextBtn.textContent = 'Далее →';
  nextBtn.addEventListener('click', () => { idx = (idx + 1) % screenshots.length; show(); });
  nav.append(nextBtn);
  body.append(nav);
  function show() { const sh = screenshots[idx]; imgWrap.innerHTML = ''; imgWrap.append(el('img', { src: sh.url, style: 'max-width: 100%; max-height: 500px;' })); const h2 = $('h2', m); if (h2) h2.textContent = 'Скриншот ' + (idx + 1) + ' из ' + screenshots.length; }
  show();
  m.append(body);
  openM(m, true);
}

// ============================================
// IMAGE HELPERS
// ============================================
function compressImage(file, maxW) {
  maxW = maxW || 800;
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = function(e) { const img = new Image(); img.onload = function() { let w = img.width, h = img.height; if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; } const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); c.toBlob(b => { if (!b) rej(new Error('Ошибка')); else res({ blob: b, width: w, height: h }); }, 'image/jpeg', 0.85); }; img.onerror = () => rej(new Error('Не изображение')); img.src = e.target.result; };
    r.onerror = () => rej(new Error('Ошибка'));
    r.readAsDataURL(file);
  });
}

function uploadToImgBB(file) {
  return new Promise((res, rej) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('key', IMGBB_KEY);
    fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd }).then(r => r.json()).then(d => { if (d.success) res(d.data.url); else rej(new Error(d.error ? d.error.message : 'Ошибка')); }).catch(rej);
  });
}

// ============================================
// SEARCH
// ============================================
$('#searchInput').addEventListener('input', e => {
  const v = e.target.value.trim();
  if (v.length >= 2) { S.route = { p: 'catalog', params: { search: v } }; render(); updateTabs(); }
  else if (v.length === 0 && S.route.p === 'catalog') { S.route = { p: 'home' }; render(); updateTabs(); }
});
