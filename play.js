/* play.js
   Timer + timed-based scoring system.
   Theme logic removed — Play no longer reads or applies per-quiz theme.
*/

const STORAGE_KEY = 'quiz_sprint_v1_all';

const quizTitleDisplay = document.getElementById('quizTitleDisplay');
const qText = document.getElementById('qText');
const qMedia = document.getElementById('qMedia');
const answersEl = document.getElementById('answers');
const qIndex = document.getElementById('qIndex');
const backHome = document.getElementById('backHome');
const timerNumber = document.getElementById('timerNumber');
const timerBar = document.getElementById('timerBar');
const feedbackEl = document.getElementById('feedback');
const scoreValueEl = document.getElementById('scoreValue');
const questionCard = document.querySelector('.question-card');

let store = loadStore();
let quiz = getCurrentQuiz();
let currentIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let timeLimit = 20;
let totalScore = 0;
let answered = false;

const DEFAULT_BASE_POINTS = 500;
const DEFAULT_BONUS_POINTS = 500;

function loadStore(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { quizzes: [], currentId: null };
    return JSON.parse(raw);
  }catch(e){
    return { quizzes: [], currentId: null };
  }
}
function getCurrentQuiz(){
  if(!store.currentId) return null;
  return store.quizzes.find(q=>q.id === store.currentId) || null;
}

function startTimer(limit){
  clearTimer();
  timeLimit = Math.max(1, Math.floor(limit || 20));
  timeLeft = timeLimit;
  updateTimerUI();
  timerInterval = setInterval(()=>{
    timeLeft -= 0.2;
    if(timeLeft <= 0){
      timeLeft = 0;
      updateTimerUI();
      clearTimer();
      onTimeExpired();
    } else {
      updateTimerUI();
    }
  }, 200);
}

function clearTimer(){
  if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerUI(){
  const pct = Math.max(0, Math.min(1, timeLeft / timeLimit));
  timerNumber.textContent = String(Math.ceil(timeLeft));
  timerBar.style.width = (pct * 100) + '%';
}

function computeScoreForQuestion(q, remaining){
  if(!q) return 0;
  const Tmax = q.timeLimit || quiz?.defaultTime || timeLimit || 20;
  const basePoints = (typeof q.basePoints === 'number') ? q.basePoints : (typeof quiz?.basePoints === 'number') ? quiz.basePoints : DEFAULT_BASE_POINTS;
  const bonusPoints = (typeof q.bonusPoints === 'number') ? q.bonusPoints : (typeof quiz?.bonusPoints === 'number') ? quiz.bonusPoints : DEFAULT_BONUS_POINTS;
  const rem = Math.max(0, Math.min(Tmax, Number(remaining || 0)));
  const speedFactor = (Tmax > 0) ? (rem / Tmax) : 0;
  const speedBonus = Math.round(bonusPoints * speedFactor);
  const awarded = Math.round(basePoints + speedBonus);
  return Math.max(0, awarded);
}

function renderQuestion(idx){
  clearTimer();
  answered = false;
  feedbackEl.className = 'feedback hidden';
  if(!quiz) return;
  const qs = quiz.questions || [];
  if(qs.length === 0){
    qText.textContent = 'No questions in this quiz';
    qMedia.innerHTML = '';
    answersEl.innerHTML = '';
    qIndex.textContent = '';
    return;
  }
  currentIndex = Math.max(0, Math.min(idx, qs.length - 1));
  const q = qs[currentIndex];
  quizTitleDisplay.textContent = quiz.title || 'Quiz';
  qText.textContent = q.prompt || '';

  qMedia.innerHTML = '';
  if(q.media){
    const src = q.media;
    if(typeof src === 'string'){
      if(src.startsWith('data:video')) {
        const v = document.createElement('video');
        v.src = src; v.controls = true; v.preload = 'metadata';
        v.style.maxWidth = '100%';
        v.style.maxHeight = '100%';
        v.style.objectFit = 'contain';
        qMedia.appendChild(v);
      } else if(src.startsWith('data:audio')) {
        const a = document.createElement('audio');
        a.src = src; a.controls = true;
        a.style.width = '100%';
        qMedia.appendChild(a);
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.alt = q.mediaName || `Question ${currentIndex+1} media`;
        qMedia.appendChild(img);
      }
    }
  }

  answersEl.innerHTML = '';
  const bgClasses = ['answer-bg-red','answer-bg-blue','answer-bg-yellow','answer-bg-green'];
  (q.choices || []).forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'answer-item ' + (bgClasses[i % bgClasses.length] || bgClasses[0]);
    row.dataset.idx = i;
    row.setAttribute('role','listitem');
    row.setAttribute('tabindex','0');
    row.setAttribute('aria-label', `Answer ${i+1}: ${c.text || 'option'}`);
    row.innerHTML = `<div class="answer-text">${escapeHtml(c.text || '')}</div>`;
    row.addEventListener('click', ()=> onAnswerSelected(i));
    row.addEventListener('keydown', (e)=> {
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnswerSelected(i); }
      if(e.key === 'ArrowDown') { e.preventDefault(); focusNextAnswer(i); }
      if(e.key === 'ArrowUp') { e.preventDefault(); focusPrevAnswer(i); }
    });
    answersEl.appendChild(row);
  });

  qIndex.textContent = `Question ${currentIndex + 1} of ${qs.length}`;

  setTimeout(()=> {
    const mediaEl = qMedia.firstElementChild;
    if(mediaEl){
      mediaEl.style.maxWidth = '100%';
      mediaEl.style.maxHeight = '100%';
    }
  }, 20);

  const qTimeLimit = q.timeLimit || quiz.defaultTime || 20;
  startTimer(qTimeLimit);
}

function focusNextAnswer(idx){
  const next = answersEl.children[idx+1];
  if(next) next.focus();
}
function focusPrevAnswer(idx){
  const prev = answersEl.children[idx-1];
  if(prev) prev.focus();
}

function onAnswerSelected(choiceIdx){
  if(answered) return;
  const qs = quiz.questions || [];
  const q = qs[currentIndex];
  if(!q) return;
  answered = true;
  clearTimer();
  Array.from(answersEl.children).forEach(el => el.classList.add('disabled'));
  const choice = q.choices && q.choices[choiceIdx];
  const correctIdx = (q.choices || []).findIndex(c => c.isCorrect);
  const isCorrect = !!(choice && choice.isCorrect);

  Array.from(answersEl.children).forEach((el, i) => {
    el.classList.remove('revealed-correct','revealed-incorrect');
    if(i === correctIdx) el.classList.add('revealed-correct');
    if(i === choiceIdx && !isCorrect) el.classList.add('revealed-incorrect');
  });

  const remaining = Math.max(0, Math.ceil(timeLeft));
  let awarded = 0;
  if(isCorrect){
    awarded = computeScoreForQuestion(q, remaining);
    totalScore += awarded;
    feedbackEl.textContent = `Correct — +${awarded} points`;
    feedbackEl.className = 'feedback correct';
  } else {
    feedbackEl.textContent = `Incorrect — correct answer shown`;
    feedbackEl.className = 'feedback incorrect';
  }

  updateScoreUI();
  feedbackEl.setAttribute('tabindex','-1');
  feedbackEl.focus();

  setTimeout(()=> {
    if(currentIndex < (quiz.questions || []).length - 1) renderQuestion(currentIndex + 1);
    else showEndScreen();
  }, 1200);
}

function onTimeExpired(){
  if(answered) return;
  answered = true;
  const qs = quiz.questions || [];
  const q = qs[currentIndex];
  if(!q) return;
  Array.from(answersEl.children).forEach((el, i) => {
    const correctIdx = (q.choices || []).findIndex(c => c.isCorrect);
    if(i === correctIdx) el.classList.add('revealed-correct');
    el.classList.add('disabled');
  });
  feedbackEl.textContent = 'Time up — correct answer shown';
  feedbackEl.className = 'feedback incorrect';
  setTimeout(()=> {
    if(currentIndex < (quiz.questions || []).length - 1) renderQuestion(currentIndex + 1);
    else showEndScreen();
  }, 1200);
}

function updateScoreUI(){
  scoreValueEl.textContent = String(totalScore);
}

function showEndScreen(){
  clearTimer();
  qText.textContent = 'Quiz complete';
  qMedia.innerHTML = '';
  answersEl.innerHTML = `<div class="answer-item disabled"><div class="answer-text">Final score: <strong>${totalScore}</strong></div></div>`;
  qIndex.textContent = '';
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = 'Thanks for playing';

  // NEW: hide timer after last question
  const timerWrap = document.querySelector('.timer-wrap');
  if (timerWrap) {
    timerWrap.style.display = 'none';
  }
}


/* helpers */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

/* navigation */
if(backHome) backHome.addEventListener('click', ()=> window.location.href = 'homepage.html');

/* responsive adjustments */
window.addEventListener('resize', debounce(()=> {
  const mediaEl = qMedia.firstElementChild;
  if(mediaEl){ mediaEl.style.maxWidth = '100%'; mediaEl.style.maxHeight = '100%'; }
}, 120));
window.addEventListener('orientationchange', ()=> setTimeout(()=>{ const mediaEl = qMedia.firstElementChild; if(mediaEl){ mediaEl.style.maxWidth='100%'; mediaEl.style.maxHeight='100%'; } }, 200));

/* init */
(function init(){
  if(!store.quizzes || !Array.isArray(store.quizzes)) store.quizzes = [];
  if(store.quizzes.length === 0){
    const defaultQuiz = { id: 'quiz_default', title: 'My Quiz', desc:'', defaultTime:20, defaultPoints:'standard', defaultAnswerMode:'single', questions: [] };
    store.quizzes.push(defaultQuiz);
    store.currentId = defaultQuiz.id;
    saveStore();
  }
  if(!store.currentId || !store.quizzes.find(q=>q.id===store.currentId)) store.currentId = store.quizzes[0].id;
  totalScore = 0;
  updateScoreUI();
  quiz = getCurrentQuiz();
  renderQuestion(0);
})();

/* utility */
function debounce(fn, t){ let id; return (...a)=>{ clearTimeout(id); id = setTimeout(()=>fn(...a), t); }; }
function saveStore(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }catch(e){} }
