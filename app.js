import { StorageManager } from './vendor/storage-manager.js';
import { MENUS, MENU_TYPES, SUBJECTS, DATA_COUNTS } from './data/menus.js';

const storage = new StorageManager('jigaku-coach-v1');
const app = document.querySelector('#app');
const gradeSelect = document.querySelector('#grade-select');
const IMG_ROOT = 'https://tt-sensei.github.io/navi-character-/assets/web/';

const PURPOSES = [
  { id: 'review', label: '今日習ったことをもう一度', value: '復習', icon: '↩' },
  { id: 'weak', label: '苦手なところをやりたい', value: '苦手', icon: '△' },
  { id: 'memorize', label: '覚えたい', value: '覚える', icon: '□' },
  { id: 'explore', label: 'もっと知りたい', value: 'もっと知る', icon: '?' },
  { id: 'test', label: 'テストの準備', value: 'テスト', icon: '✓' },
  { id: 'any', label: '何でもいい！', value: '何でも', icon: '○' }
];
const TIMES = [
  { id: 'short', label: '10分くらい', minutes: 10, range: [0, 12] },
  { id: 'medium', label: '20分くらい', minutes: 20, range: [13, 22] },
  { id: 'long', label: 'じっくり', minutes: 30, range: [23, 99] }
];
const RESOURCE_GROUPS = {
  video: { label: '説明や動画で確かめたい', icon: '▶' },
  practice: { label: '問題を練習したい', icon: '✎' },
  print: { label: 'プリントで学びたい', icon: '▤' },
  app: { label: '学習アプリで練習したい', icon: '▦' }
};
const RESOURCES = [
  { group: 'video', title: 'NHK for School', desc: '教科や学年から、授業につながる動画や番組を探せます。', url: 'https://www.nhk.or.jp/school/', subject: 'いろいろ' },
  { group: 'video', title: 'eboard', desc: '小学生向けの算数・理科・社会・漢字を、映像授業と問題で確かめられます。', url: 'https://www.eboard.jp/list/', subject: '国語・算数・理科・社会' },
  { group: 'practice', title: '東京ベーシック・ドリル（電子版）', desc: '学年と教科を選んで、基礎的な問題に取り組めます。', url: 'https://www.kyoiku.metro.tokyo.lg.jp/school/study_material/improvement/tokyo_basic_drill/about', subject: '国語・算数・社会・理科' },
  { group: 'practice', title: 'eboard', desc: '単元ごとの短い映像と確認問題で、分からないところを戻って確かめられます。', url: 'https://www.eboard.jp/list/', subject: '国語・算数・理科・社会' },
  { group: 'print', title: '東京ベーシック・ドリル（プリント教材）', desc: '教科・学年・学習内容を選び、問題と答えのPDFを印刷できます。', url: 'https://www.kyoiku.metro.tokyo.lg.jp/school/study_material/improvement/tokyo_basic_drill/about', subject: '国語・算数・社会・理科' },
  { group: 'app', title: 'Learning Portal', desc: '学年や教科から、自分に合う学習アプリを選べます。', url: 'https://tt-sensei.github.io/learning-portal/', subject: 'いろいろ' },
  { group: 'app', title: '漢字マスター', desc: '漢字を練習したいときに。終わったら、間違えた一字をノートに残そう。', url: 'https://tt-sensei.github.io/kanjiapp/', subject: '国語' },
  { group: 'app', title: '単位研究所', desc: '長さ・かさ・重さなどの単位を確かめたいときに。気付いた関係を一つノートへ。', url: 'https://tt-sensei.github.io/tanilabo/', subject: '算数' },
  { group: 'app', title: '都道府県マスター', desc: '都道府県の位置や特色を復習したいときに。苦手な県を一つノートへ。', url: 'https://tt-sensei.github.io/todoufuken/', subject: '社会' },
  { group: 'app', title: 'ことばの森・立式の旅', desc: '文章題の式を立てる練習に。使った考え方を一つノートへ。', url: 'https://tt-sensei.github.io/bunsyo-dai/', subject: '算数' }
];

let state = {
  route: 'home',
  grade: Number(storage.load('settings', {}).grade) || 3,
  coach: { purpose: null, time: null, subject: null },
  candidates: [],
  activeMenu: null,
  menuFilters: { query: '', subject: 'all', type: 'all', minutes: 'all' },
  resourceGroup: 'video'
};

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const todayString = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const formatDate = dateString => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${dateString}T00:00:00`));
const daysFromToday = dateString => Math.round((new Date(`${dateString}T00:00:00`) - new Date(`${todayString()}T00:00:00`)) / 86400000);
const getRecords = () => storage.load('records', []).filter(item => item && item.date && item.menuId);
const getTests = () => storage.load('tests', []).filter(item => item && item.id && item.date).sort((a, b) => a.date.localeCompare(b.date));
const subjectLabel = id => SUBJECTS[id]?.label || id;
const typeLabel = id => MENU_TYPES[id]?.label || id;
const difficultyStars = n => '★'.repeat(n);
const imageFallback = event => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.classList.remove('image-fallback'); };

function saveSettings() {
  storage.save('settings', { grade: state.grade });
}

function navigate(route, data = {}) {
  state.route = route;
  Object.assign(state, data);
  render();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  requestAnimationFrame(() => app.focus({ preventScroll: true }));
}

function screenHead(title, lead = '', back = 'home') {
  return `<div class="screen-head">
    <button class="back-button" type="button" data-route="${back}">← もどる</button>
    <div><h1 class="screen-title">${esc(title)}</h1>${lead ? `<p class="screen-lead">${esc(lead)}</p>` : ''}</div>
  </div>`;
}

function renderHome() {
  const upcoming = getTests().filter(test => daysFromToday(test.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
  const testHint = upcoming ? `${subjectLabel(upcoming.subject)}「${esc(upcoming.name)}」の予定があります。` : 'テストの予定を自分で登録できます。';
  return `<section class="screen home-screen">
    <div class="hero">
      <div>
        <span class="eyebrow">TODAY'S JIGAKU</span>
        <h1>今日は、どんな学習にする？</h1>
        <p>自分で決めたら、ノートを開いて始めよう。</p>
      </div>
      <div>
        <img class="hero-image" src="${IMG_ROOT}groups/learning/group-learning-pair-consulting.webp" alt="二人で学習の相談をしている様子">
        <span class="image-fallback" aria-hidden="true">📓</span>
      </div>
    </div>
    <div class="main-grid">
      <button class="entrance-card primary" type="button" data-route="decide">
        <span class="icon" aria-hidden="true">◎</span><h2>今日の自学を決める</h2>
        <p>今の気持ちや時間に合うものを、三つ提案します。</p><span class="arrow" aria-hidden="true">→</span>
      </button>
      <button class="entrance-card" type="button" data-route="menus">
        <span class="icon" aria-hidden="true">▤</span><h2>自学メニューから探す</h2><p>100のメニューから、自分で選びたいとき。</p><span class="arrow" aria-hidden="true">→</span>
      </button>
      <button class="entrance-card" type="button" data-route="tests">
        <span class="icon" aria-hidden="true">✓</span><h2>テストに向けて</h2><p>${testHint}</p><span class="arrow" aria-hidden="true">→</span>
      </button>
      <button class="entrance-card" type="button" data-route="resources">
        <span class="icon" aria-hidden="true">⌕</span><h2>学習資料室</h2><p>分からないことを確かめたり、練習したり。</p><span class="arrow" aria-hidden="true">→</span>
      </button>
    </div>
    <div class="subnav">
      <button type="button" data-route="guide">自学のやり方</button>
      <button type="button" data-route="records">学習記録</button>
      <button type="button" data-route="tests">テスト予定</button>
    </div>
  </section>`;
}

function renderDecide() {
  return `<section class="screen">
    ${screenHead('今日の自学を決める', '答えは一つではありません。最後は自分で選ぼう。')}
    <div class="panel">
      <div class="choice-step active" data-step="1">
        <span class="step-kicker">STEP 1 / 3</span><h2>今日は、どんな感じ？</h2>
        <div class="choice-grid">${PURPOSES.map(item => `<button class="choice-button ${state.coach.purpose === item.id ? 'selected' : ''}" type="button" data-coach-purpose="${item.id}"><span aria-hidden="true">${item.icon}</span><br>${item.label}</button>`).join('')}</div>
        <div class="coach-nav"><span></span><button class="primary-button" type="button" data-coach-next="2" ${state.coach.purpose ? '' : 'disabled'}>つぎへ →</button></div>
      </div>
      <div class="choice-step" data-step="2">
        <span class="step-kicker">STEP 2 / 3</span><h2>どのくらいやる？</h2>
        <div class="choice-grid">${TIMES.map(item => `<button class="choice-button ${state.coach.time === item.id ? 'selected' : ''}" type="button" data-coach-time="${item.id}">${item.label}<br><small>${item.id === 'short' ? 'さっと集中' : item.id === 'medium' ? '一つをしっかり' : '考えを深める'}</small></button>`).join('')}</div>
        <div class="coach-nav"><button class="secondary-button" type="button" data-coach-back="1">← もどる</button><button class="primary-button" type="button" data-coach-next="3" ${state.coach.time ? '' : 'disabled'}>つぎへ →</button></div>
      </div>
      <div class="choice-step" data-step="3">
        <span class="step-kicker">STEP 3 / 3</span><h2>教科は決まっている？</h2>
        <div class="choice-grid">
          <button class="choice-button ${state.coach.subject === 'all' ? 'selected' : ''}" type="button" data-coach-subject="all">どの教科でも</button>
          ${Object.values(SUBJECTS).map(subject => `<button class="choice-button subject-${subject.id} ${state.coach.subject === subject.id ? 'selected' : ''}" type="button" data-coach-subject="${subject.id}">${subject.label}</button>`).join('')}
        </div>
        <div class="coach-nav"><button class="secondary-button" type="button" data-coach-back="2">← もどる</button><button class="primary-button" type="button" id="show-candidates" ${state.coach.subject ? '' : 'disabled'}>三つ見てみる</button></div>
      </div>
    </div>
  </section>`;
}

function chooseCandidates() {
  const purpose = PURPOSES.find(item => item.id === state.coach.purpose);
  const time = TIMES.find(item => item.id === state.coach.time);
  const tests = getTests().filter(test => daysFromToday(test.date) >= 0 && daysFromToday(test.date) <= 7);
  const recent = getRecords().slice(-12);
  const recentIds = new Set(recent.map(item => item.menuId));
  const recentSubjects = recent.reduce((acc, item) => ((acc[item.subject] = (acc[item.subject] || 0) + 1), acc), {});
  let pool = MENUS.filter(menu => menu.grades.includes(state.grade));
  if (state.coach.subject !== 'all') pool = pool.filter(menu => menu.subject === state.coach.subject);

  const scored = pool.map(menu => {
    let score = Math.random() * 2;
    if (purpose?.value === '何でも' || menu.purposes.includes(purpose?.value)) score += 9;
    if (time && menu.minutes >= time.range[0] && menu.minutes <= time.range[1]) score += 7;
    else if (time) score -= Math.abs(menu.minutes - time.minutes) / 4;
    if (tests.some(test => test.subject === menu.subject)) score += menu.testRecommended ? 7 : 3;
    if (recentIds.has(menu.id)) score -= 12;
    score -= (recentSubjects[menu.subject] || 0) * .55;
    return { menu, score };
  }).sort((a, b) => b.score - a.score);

  const picks = [];
  for (const item of scored) {
    if (picks.length >= 3) break;
    if (picks.length < 2 && picks.some(menu => menu.type === item.menu.type) && scored.length > 5) continue;
    picks.push(item.menu);
  }
  if (picks.length < 3) scored.forEach(item => { if (picks.length < 3 && !picks.includes(item.menu)) picks.push(item.menu); });
  state.candidates = picks;
  navigate('candidates');
}

function recommendationMessage() {
  const recent = getRecords().slice(-8);
  if (!recent.length) return '今の気持ちと時間に合いそうなものを選びました。どれにするかは自分で決めよう。';
  const counts = recent.reduce((acc, item) => ((acc[item.subject] = (acc[item.subject] || 0) + 1), acc), {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (top?.[1] >= 4 && state.coach.subject === 'all') return `最近は${subjectLabel(top[0])}をがんばっているね。今日は、ほかの教科も一緒に提案しています。`;
  const tests = getTests().filter(test => daysFromToday(test.date) >= 0 && daysFromToday(test.date) <= 7);
  if (tests.length) return `${subjectLabel(tests[0].subject)}のテスト予定も考えて選びました。やりたいものを選ぼう。`;
  return '最近やったものと重なりすぎないように選びました。気になるものを選ぼう。';
}

function menuCard(menu) {
  return `<article class="menu-card">
    <div class="chips"><span class="chip">${subjectLabel(menu.subject)}</span><span class="chip type-${menu.type}">${typeLabel(menu.type)}</span><span class="chip">${menu.minutes}分</span><span class="chip" aria-label="手間の目安 ${menu.difficulty}段階">${difficultyStars(menu.difficulty)}</span></div>
    <h3>${esc(menu.title)}</h3><p>${esc(menu.whenToUse)}</p>
    <button class="primary-button" type="button" data-menu-id="${menu.id}">これにする</button>
  </article>`;
}

function renderCandidates() {
  return `<section class="screen">
    ${screenHead('この三つはどう？', 'どれも正解。やってみたいものを選ぼう。', 'decide')}
    <p class="recommendation-note">${recommendationMessage()}</p>
    <div class="card-grid">${state.candidates.map(menuCard).join('')}</div>
    <div class="coach-nav"><button class="secondary-button" type="button" id="rechoose">ほかの三つを見る</button><button class="secondary-button" type="button" data-route="menus">100のメニューから探す</button></div>
  </section>`;
}

function getFilteredMenus() {
  const f = state.menuFilters;
  return MENUS.filter(menu => menu.grades.includes(state.grade))
    .filter(menu => f.subject === 'all' || menu.subject === f.subject)
    .filter(menu => f.type === 'all' || menu.type === f.type)
    .filter(menu => f.minutes === 'all' || (f.minutes === '10' ? menu.minutes <= 12 : f.minutes === '20' ? menu.minutes >= 13 && menu.minutes <= 22 : menu.minutes >= 23))
    .filter(menu => !f.query || `${menu.title} ${menu.instruction} ${menu.purposes.join(' ')}`.toLowerCase().includes(f.query.toLowerCase()));
}

function renderMenus() {
  const menus = getFilteredMenus();
  return `<section class="screen">
    ${screenHead('自学メニューから探す', `${state.grade}年生ができるメニューを表示しています。全体では100メニューです。`)}
    <div class="filters">
      <input id="menu-search" type="search" placeholder="ことばで探す" value="${esc(state.menuFilters.query)}" aria-label="メニューを検索">
      <select id="filter-subject" aria-label="教科でしぼる"><option value="all">すべての教科</option>${Object.values(SUBJECTS).map(s => `<option value="${s.id}" ${state.menuFilters.subject === s.id ? 'selected' : ''}>${s.label}（${DATA_COUNTS[s.id]}）</option>`).join('')}</select>
      <select id="filter-type" aria-label="型でしぼる"><option value="all">すべての型</option>${Object.values(MENU_TYPES).map(t => `<option value="${t.id}" ${state.menuFilters.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
      <select id="filter-minutes" aria-label="時間でしぼる"><option value="all">すべての時間</option><option value="10" ${state.menuFilters.minutes === '10' ? 'selected' : ''}>10分くらい</option><option value="20" ${state.menuFilters.minutes === '20' ? 'selected' : ''}>20分くらい</option><option value="30" ${state.menuFilters.minutes === '30' ? 'selected' : ''}>じっくり</option></select>
    </div>
    <p class="result-count">${menus.length}件見つかりました</p>
    <div class="card-grid">${menus.length ? menus.map(menuCard).join('') : '<div class="empty-state">条件に合うメニューがありません。しぼりこみを少し戻してみよう。</div>'}</div>
  </section>`;
}

function coachSteps(menu) {
  const type = MENU_TYPES[menu.type];
  const common = [
    { title: '日付を書く', text: 'ノートのいちばん上に、今日の日付を書こう。' },
    { title: 'めあてを書く', text: 'そのまま写しても、自分の言葉に変えてもOK。', goal: menu.goalExample }
  ];
  const specific = menu.customSteps.map((step, index) => ({ title: index === 0 ? '始める' : 'つづける', text: step }));
  return [...common, ...specific, { title: '確かめ方を決める', text: menu.type === 'C' ? '本や二つ以上の資料で、予想と比べて確かめよう。' : menu.type === 'B' ? '教科書や資料と見比べ、足りないところを一つ直そう。' : '答えや教科書で確かめ、間違いがあれば直そう。' }];
}

function renderCoach() {
  const menu = state.activeMenu || MENUS[0];
  const steps = coachSteps(menu);
  const character = `${IMG_ROOT}characters/kai/fullbody/checking-note.webp`;
  return `<section class="screen">
    ${screenHead(menu.title, `${subjectLabel(menu.subject)}・${typeLabel(menu.type)}・${menu.minutes}分くらい`, state.candidates.length ? 'candidates' : 'menus')}
    <div class="coach-layout">
      <article class="coach-card">
        <header class="coach-card-head"><div class="chips"><span class="chip">${subjectLabel(menu.subject)}</span><span class="chip type-${menu.type}">${typeLabel(menu.type)}</span><span class="chip">${difficultyStars(menu.difficulty)} ${menu.difficulty === 1 ? 'すぐできる' : menu.difficulty === 2 ? 'しっかり' : 'チャレンジ'}</span></div><h1>${esc(menu.title)}</h1><p>${esc(menu.instruction)}</p></header>
        <ol class="step-list">${steps.map(step => `<li class="step-item"><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p>${step.goal ? `<div class="goal-box"><strong>めあての例</strong><br>「${esc(step.goal)}」</div>` : ''}</li>`).join('')}</ol>
        <div class="notebook-launch"><span class="notebook-icon" aria-hidden="true">📓</span><strong>ここからはノートでやってみよう！</strong><p>画面を閉じてOK。終わったら、ここに戻ってこよう。</p><button class="primary-button" type="button" id="finish-menu">できた！</button></div>
      </article>
      <aside class="side-coach">
        <div><img src="${character}" alt="ノートを確かめる案内役"><span class="image-fallback" aria-hidden="true">📓</span></div>
        <p class="speech">まずはノートを開こう。</p>
        <div class="material-list"><h3>用意するもの</h3><ul>${menu.materials.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>
        ${menu.relatedResources.length ? `<div class="material-list"><h3>困ったときの練習</h3><ul>${menu.relatedResources.map(resource => `<li><a href="${resource.url}" target="_blank" rel="noopener">${esc(resource.title)}</a></li>`).join('')}</ul></div>` : ''}
      </aside>
    </div>
  </section>`;
}

function openFinishModal(menu) {
  const template = document.querySelector('#modal-template');
  const fragment = template.content.cloneNode(true);
  const backdrop = fragment.querySelector('.modal-backdrop');
  const content = fragment.querySelector('.modal-content');
  content.innerHTML = `<h2 id="modal-title">終わったら、確かめよう</h2><p>答えや教科書で確かめた？</p><div class="check-options"><button type="button" data-check="notyet">まだ</button><button type="button" data-check="checked">確かめた</button></div><div id="finish-next"></div>`;
  document.body.append(fragment);
  const liveBackdrop = document.querySelector('.modal-backdrop:last-of-type');
  const close = () => liveBackdrop.remove();
  liveBackdrop.querySelector('.modal-close').addEventListener('click', close);
  liveBackdrop.addEventListener('click', event => { if (event.target === liveBackdrop) close(); });
  liveBackdrop.querySelector('[data-check="notyet"]').addEventListener('click', () => {
    liveBackdrop.querySelector('#finish-next').innerHTML = `<div class="reflection-box"><strong>あと一歩。</strong><p>答えや教科書で確かめてから、もう一度「できた！」を押そう。画面は閉じて大丈夫です。</p></div>`;
  });
  liveBackdrop.querySelector('[data-check="checked"]').addEventListener('click', () => {
    liveBackdrop.querySelectorAll('[data-check]').forEach(button => button.classList.toggle('selected', button.dataset.check === 'checked'));
    liveBackdrop.querySelector('#finish-next').innerHTML = `<p><strong>間違いはあった？</strong></p><div class="check-options"><button type="button" data-mistake="yes">あった</button><button type="button" data-mistake="no">なかった</button></div>`;
    liveBackdrop.querySelectorAll('[data-mistake]').forEach(button => button.addEventListener('click', () => showReflection(liveBackdrop, menu, button.dataset.mistake === 'yes')));
  });
  liveBackdrop.querySelector('.modal-close').focus();
}

function showReflection(modal, menu, hadMistake) {
  const target = modal.querySelector('#finish-next');
  target.innerHTML = `${hadMistake ? '<div class="reflection-box"><strong>間違いは大事なヒント。</strong><p>答えを写すだけでなく、どこで考えが変わったか確かめよう。</p></div>' : ''}
    <div class="reflection-box"><strong>最後に、ノートで振り返ろう</strong><ul>${menu.reflectionPrompts.map(prompt => `<li>${esc(prompt)}</li>`).join('')}</ul><p>全部書かなくても大丈夫。一つ選ぼう。</p></div>
    ${hadMistake ? '<p><strong>間違いを直すところまでできた？</strong></p>' : ''}
    <button class="primary-button" type="button" id="save-completion">${hadMistake ? '直して、今日はおわり' : '今日はおわり'}</button>`;
  target.querySelector('#save-completion').addEventListener('click', () => {
    const records = getRecords();
    records.push({ date: todayString(), subject: menu.subject, menuId: menu.id, minutes: menu.minutes, completed: true });
    storage.save('records', records.slice(-500));
    modal.remove();
    showDone(menu);
  });
}

function showDone(menu) {
  const template = document.querySelector('#modal-template');
  const fragment = template.content.cloneNode(true);
  fragment.querySelector('.modal-content').innerHTML = `<div style="text-align:center"><img src="${IMG_ROOT}characters/saku/fullbody/complete.webp" alt="学習の終わりを認める案内役" style="width:130px;height:130px;object-fit:contain"><h2 id="modal-title">自分で決めて、確かめられたね。</h2><p>今日の記録は、学習した方法として残しました。</p><div class="coach-nav"><button class="secondary-button" type="button" data-route="records">記録を見る</button><button class="primary-button" type="button" data-route="home">ホームへ</button></div></div>`;
  document.body.append(fragment);
  const modal = document.querySelector('.modal-backdrop:last-of-type');
  modal.querySelector('.modal-close').addEventListener('click', () => { modal.remove(); navigate('home'); });
  modal.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => { const route = button.dataset.route; modal.remove(); navigate(route); }));
}

function renderGuide() {
  const flows = [['①','決める'],['②','めあてをもつ'],['③','やってみる'],['④','確かめる'],['⑤','振り返る']];
  return `<section class="screen">${screenHead('自学のやり方', 'ノートのページ数より、学び方を大切にしよう。')}
    <div class="panel">
      <div class="guide-flow">${flows.map(([n, label]) => `<div><span>${n}</span>${label}</div>`).join('')}</div>
      <div class="type-grid">${Object.values(MENU_TYPES).map(type => `<article class="type-card"><span class="chip type-${type.id}">${type.id}</span><h3>${type.label}</h3><p>${type.steps.join(' → ')}</p></article>`).join('')}</div>
      <div class="guide-message">たくさん解くことや、きれいに埋めることだけが自学ではありません。<br>短くても、自分で考えて「分かった！」が増えれば、いい自学。</div>
    </div>
  </section>`;
}

function testAdvice(test) {
  const days = daysFromToday(test.date);
  if (days < 0) return '終わったテストです。できるようになったことを一つ見つけよう。';
  if (days === 0) return 'できるようになったことを確認してみよう。';
  if (days <= 2) return 'これまで間違えた問題を少し確かめてみよう。';
  if (days <= 6) return '難しかったところをもう一度やってみるのもおすすめ。';
  return 'まず、できるところと難しいところを見つけよう。';
}

function renderTests() {
  const tests = getTests();
  return `<section class="screen">${screenHead('テスト予定', '予定を見て、何を確かめるかは自分で決めよう。')}
    <div class="panel">
      <form id="test-form"><div class="form-grid">
        <label class="field">教科<select name="subject" required>${Object.values(SUBJECTS).filter(s => s.id !== 'cross').map(s => `<option value="${s.id}">${s.label}</option>`).join('')}</select></label>
        <label class="field">テスト名<input name="name" maxlength="40" required placeholder="例：分数のたし算"></label>
        <label class="field">日付<input name="date" type="date" min="${todayString()}" required></label>
        <label class="field">範囲（書かなくてもOK）<input name="range" maxlength="80" placeholder="例：教科書 42〜55ページ"></label>
      </div><div class="coach-nav"><span></span><button class="primary-button" type="submit">予定を登録する</button></div></form>
      <div class="test-list">${tests.length ? tests.map(test => `<article class="test-item"><div class="date-badge">${formatDate(test.date)}</div><div><h3>${subjectLabel(test.subject)}　${esc(test.name)}</h3><p>${test.range ? `${esc(test.range)} ／ ` : ''}${esc(testAdvice(test))}</p></div><button class="danger-button" type="button" data-delete-test="${esc(test.id)}">削除</button></article>`).join('') : '<div class="empty-state">登録したテストはありません。予定が分かったら、自分で追加できます。</div>'}</div>
    </div>
  </section>`;
}

function calendarMarkup(records) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const learned = new Set(records.filter(r => { const d = new Date(`${r.date}T00:00:00`); return d.getFullYear() === year && d.getMonth() === month; }).map(r => Number(r.date.slice(-2))));
  const cells = ['日','月','火','水','木','金','土'].map(day => `<span class="weekday">${day}</span>`);
  for (let i = 0; i < first; i++) cells.push('<span class="blank"></span>');
  for (let day = 1; day <= last; day++) cells.push(`<span class="${learned.has(day) ? 'learned' : ''}" ${learned.has(day) ? 'aria-label="学習した日"' : ''}>${day}</span>`);
  return cells.join('');
}

function renderRecords() {
  const records = getRecords();
  const now = new Date();
  const monthRecords = records.filter(r => { const d = new Date(`${r.date}T00:00:00`); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
  const uniqueDays = new Set(monthRecords.map(r => r.date)).size;
  const counts = Object.keys(SUBJECTS).reduce((acc, subject) => ((acc[subject] = monthRecords.filter(r => r.subject === subject).length), acc), {});
  const max = Math.max(1, ...Object.values(counts));
  const recent = [...records].reverse().slice(0, 12);
  return `<section class="screen">${screenHead('学習記録', '今月、どんな方法で学んだかを見てみよう。')}
    <div class="record-summary"><div class="month-card"><span>${now.getMonth() + 1}月の学び</span><strong>${uniqueDays ? 'いろいろな方法' : 'これから'}</strong><span>${uniqueDays ? `${uniqueDays}日、ノートで学びました。` : '最初の自学を決めてみよう。'}</span></div><div class="subject-bars">${Object.values(SUBJECTS).map(subject => `<div class="subject-row"><span>${subject.label}</span><div class="bar"><i style="width:${counts[subject.id] / max * 100}%"></i></div><span>${counts[subject.id]}</span></div>`).join('')}</div></div>
    <div class="panel"><h2>${now.getMonth() + 1}月のカレンダー</h2><div class="calendar">${calendarMarkup(records)}</div></div>
    <div class="record-list">${recent.length ? recent.map(record => { const menu = MENUS.find(m => m.id === record.menuId); return `<article class="record-item"><div class="date-badge">${formatDate(record.date)}</div><div><h3>${menu ? esc(menu.title) : '自学メニュー'}</h3><p>${subjectLabel(record.subject)}・${record.minutes}分くらい</p></div></article>`; }).join('') : '<div class="empty-state">まだ記録はありません。自学が終わったら「できた！」から記録できます。</div>'}</div>
  </section>`;
}

function renderResources() {
  const group = state.resourceGroup;
  const resources = RESOURCES.filter(resource => resource.group === group);
  return `<section class="screen">${screenHead('学習資料室', '困ったときに、説明・問題・プリント・アプリを選べます。')}
    <div class="panel"><div class="resource-tabs" role="tablist">${Object.entries(RESOURCE_GROUPS).map(([id, item]) => `<button type="button" role="tab" aria-selected="${group === id}" class="${group === id ? 'active' : ''}" data-resource-group="${id}">${item.icon} ${item.label}</button>`).join('')}</div>
      <div class="resource-grid">${resources.map(resource => `<article class="resource-card"><span class="chip">${resource.subject}</span><h3>${resource.title}</h3><p>${resource.desc}</p><a class="resource-link" href="${resource.url}" target="_blank" rel="noopener">ひらく <span aria-hidden="true">↗</span></a></article>`).join('')}</div>
      <div class="resource-note">資料やアプリで確かめたら、分かったことや間違えたものを一つ、ノートに残してみよう。</div>
    </div>
  </section>`;
}

function render() {
  gradeSelect.value = String(state.grade);
  const views = { home: renderHome, decide: renderDecide, candidates: renderCandidates, menus: renderMenus, coach: renderCoach, guide: renderGuide, tests: renderTests, records: renderRecords, resources: renderResources };
  app.innerHTML = (views[state.route] || renderHome)();
  bindEvents();
  app.querySelectorAll('img').forEach(img => img.addEventListener('error', imageFallback, { once: true }));
}

function bindEvents() {
  app.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.route)));
  app.querySelectorAll('[data-menu-id]').forEach(button => button.addEventListener('click', () => {
    state.activeMenu = MENUS.find(menu => menu.id === button.dataset.menuId);
    navigate('coach');
  }));
  app.querySelectorAll('[data-coach-purpose]').forEach(button => button.addEventListener('click', () => { state.coach.purpose = button.dataset.coachPurpose; render(); }));
  app.querySelectorAll('[data-coach-time]').forEach(button => button.addEventListener('click', () => { state.coach.time = button.dataset.coachTime; render(); showCoachStep(2); }));
  app.querySelectorAll('[data-coach-subject]').forEach(button => button.addEventListener('click', () => { state.coach.subject = button.dataset.coachSubject; render(); showCoachStep(3); }));
  app.querySelectorAll('[data-coach-next]').forEach(button => button.addEventListener('click', () => showCoachStep(Number(button.dataset.coachNext))));
  app.querySelectorAll('[data-coach-back]').forEach(button => button.addEventListener('click', () => showCoachStep(Number(button.dataset.coachBack))));
  app.querySelector('#show-candidates')?.addEventListener('click', chooseCandidates);
  app.querySelector('#rechoose')?.addEventListener('click', chooseCandidates);
  app.querySelector('#finish-menu')?.addEventListener('click', () => openFinishModal(state.activeMenu));
  app.querySelector('#menu-search')?.addEventListener('input', event => { state.menuFilters.query = event.target.value; rerenderMenuResults(); });
  app.querySelector('#filter-subject')?.addEventListener('change', event => { state.menuFilters.subject = event.target.value; render(); });
  app.querySelector('#filter-type')?.addEventListener('change', event => { state.menuFilters.type = event.target.value; render(); });
  app.querySelector('#filter-minutes')?.addEventListener('change', event => { state.menuFilters.minutes = event.target.value; render(); });
  app.querySelector('#test-form')?.addEventListener('submit', saveTest);
  app.querySelectorAll('[data-delete-test]').forEach(button => button.addEventListener('click', () => deleteTest(button.dataset.deleteTest)));
  app.querySelectorAll('[data-resource-group]').forEach(button => button.addEventListener('click', () => { state.resourceGroup = button.dataset.resourceGroup; render(); }));
}

function showCoachStep(number) {
  app.querySelectorAll('.choice-step').forEach(step => step.classList.toggle('active', Number(step.dataset.step) === number));
  app.querySelector(`.choice-step[data-step="${number}"] h2`)?.focus?.();
}

function rerenderMenuResults() {
  const menus = getFilteredMenus();
  const count = app.querySelector('.result-count');
  const grid = app.querySelector('.card-grid');
  if (count) count.textContent = `${menus.length}件見つかりました`;
  if (grid) {
    grid.innerHTML = menus.length ? menus.map(menuCard).join('') : '<div class="empty-state">条件に合うメニューがありません。しぼりこみを少し戻してみよう。</div>';
    grid.querySelectorAll('[data-menu-id]').forEach(button => button.addEventListener('click', () => { state.activeMenu = MENUS.find(menu => menu.id === button.dataset.menuId); navigate('coach'); }));
  }
}

function saveTest(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const tests = getTests();
  tests.push({ id: `test-${Date.now()}`, subject: form.get('subject'), name: String(form.get('name')).trim(), date: form.get('date'), range: String(form.get('range')).trim() });
  storage.save('tests', tests);
  render();
}

function deleteTest(id) {
  storage.save('tests', getTests().filter(test => test.id !== id));
  render();
}

document.querySelectorAll('.site-header [data-route]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.route)));
gradeSelect.addEventListener('change', event => { state.grade = Number(event.target.value); saveSettings(); if (state.route !== 'home') render(); });

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelector('.modal-backdrop')?.remove();
});

render();
