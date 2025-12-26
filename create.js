/* create.js
   Editor logic with theme-related code removed.
   Apply to all now only applies time/points/answerMode and updates quiz defaults.
*/

const STORAGE_KEY = 'quiz_sprint_v1_all';

let store = loadStore();
let editingId = null;

/* DOM refs */
const quizList = document.getElementById('quizList');
const addQuizBtn = document.getElementById('addQuizBtn');
const deleteQuizBtn = document.getElementById('deleteQuizBtn');
const questionList = document.getElementById('questionList');
const addQ = document.getElementById('addQ');
const qPrompt = document.getElementById('qPrompt');
const mediaDrop = document.getElementById('mediaDrop');
const mediaFile = document.getElementById('mediaFile');
const mediaNameEl = document.getElementById('mediaName');
const answersGrid = document.getElementById('answersGrid');
const saveBtn = document.getElementById('saveBtn');
const delBtn = document.getElementById('delBtn');
const dupBtn = document.getElementById('dupBtn');
const quizTitle = document.getElementById('quizTitle');
const qType = document.getElementById('qType');
const qTime = document.getElementById('qTime');
const qPoints = document.getElementById('qPoints');
const answerMode = document.getElementById('answerMode');
const applyBtn = document.getElementById('applyBtn');
const applyAllBtn = document.getElementById('applyAllBtn');
const previewBtn = document.getElementById('previewBtn');
const backBtn = document.getElementById('backBtn');

function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

function loadStore(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { quizzes: [], currentId: null };
    return JSON.parse(raw);
  }catch(e){
    return { quizzes: [], currentId: null };
  }
}
function saveStore(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }catch(e){} }

function getCurrentQuiz(){
  if(!store.currentId) return null;
  return store.quizzes.find(q=>q.id === store.currentId) || null;
}
function setCurrentQuiz(id){
  store.currentId = id;
  saveStore();
  renderQuizList();
  renderQuestionList();
  openEditor(null);
}

/* Render quizzes list */
function renderQuizList(){
  quizList.innerHTML = '';
  if(store.quizzes.length === 0){
    quizList.innerHTML = '<div class="small-muted">No quizzes yet</div>';
    return;
  }
  store.quizzes.forEach((q)=>{
    const el = document.createElement('div');
    el.className = 'q-item';
    if(store.currentId === q.id) el.classList.add('active');
    el.innerHTML = `<div style="flex:1"><strong>${escapeHtml(q.title || 'Untitled')}</strong></div>
      <div style="display:flex;gap:6px">
        <button class="btn" data-action="select" data-id="${q.id}">Open</button>
      </div>`;
    quizList.appendChild(el);
  });
}

/* Render question list for current quiz */
function renderQuestionList(){
  questionList.innerHTML = '';
  const quiz = getCurrentQuiz();
  if(!quiz){
    questionList.innerHTML = '<div class="small-muted">Select or create a quiz</div>';
    quizTitle.value = '';
    if(mediaNameEl) mediaNameEl.textContent = '';
    return;
  }
  quizTitle.value = quiz.title || '';

  const qs = quiz.questions || [];
  if(qs.length === 0){
    questionList.innerHTML = '<div class="small-muted">No questions yet</div>';
    if(mediaNameEl) mediaNameEl.textContent = '';
    return;
  }
  qs.forEach((q, idx) => {
    const el = document.createElement('div');
    el.className = 'q-item';
    if(editingId === q.id) el.classList.add('active');
    el.innerHTML = `<div><strong>${idx+1}.</strong> <span class="small-muted">${q.prompt ? q.prompt.slice(0,40) : 'Untitled'}</span></div>
      <div style="display:flex;gap:6px">
        <button class="btn" data-action="edit" data-id="${q.id}">Edit</button>
      </div>`;
    questionList.appendChild(el);
  });
}

/* Build answers grid (editor) — show inputs but color preview in background */
function buildAnswersGrid(q){
  answersGrid.innerHTML = '';
  const bgClasses = ['answer-bg-red','answer-bg-blue','answer-bg-yellow','answer-bg-green'];
  for(let i=0;i<4;i++){
    const choice = (q && q.choices && q.choices[i]) || { text:'', isCorrect:false };
    const wrapper = document.createElement('div');
    wrapper.className = 'answer-btn ' + bgClasses[i % bgClasses.length];
    wrapper.innerHTML = `
      <input class="answer-input" data-idx="${i}" value="${escapeHtml(choice.text)}" placeholder="Add answer ${i+1}" />
      <div class="answer-controls">
        <label class="small-muted">Correct</label>
        <input type="checkbox" data-idx="${i}" class="correct-checkbox" ${choice.isCorrect ? 'checked' : ''} />
      </div>
    `;
    answersGrid.appendChild(wrapper);
  }
}

/* Escape helper */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

/* Open editor for question */
function openEditor(q){
  if(!q){
    editingId = null;
    qPrompt.value = '';
    buildAnswersGrid(null);
    const quiz = getCurrentQuiz();
    if(quiz) {
      quizTitle.value = quiz.title || '';
      qType.value = 'quiz';
      qTime.value = String(quiz.defaultTime || 20);
      qPoints.value = quiz.defaultPoints || 'standard';
      answerMode.value = quiz.defaultAnswerMode || 'single';
      if(mediaNameEl) mediaNameEl.textContent = '';
    } else {
      quizTitle.value = '';
      qType.value = 'quiz';
      qTime.value = '20';
      qPoints.value = 'standard';
      answerMode.value = 'single';
      if(mediaNameEl) mediaNameEl.textContent = '';
    }
    return;
  }
  editingId = q.id;
  qPrompt.value = q.prompt || '';
  qType.value = q.type || 'quiz';
  qTime.value = String(q.timeLimit || 20);
  qPoints.value = q.points || 'standard';
  answerMode.value = q.answerMode || 'single';
  buildAnswersGrid(q);
  if(mediaNameEl) mediaNameEl.textContent = q.mediaName || '';
}

/* Quiz-level actions */
addQuizBtn.addEventListener('click', ()=>{
  const newQuiz = {
    id: uid('quiz'),
    title: 'New Quiz',
    desc: '',
    defaultTime: 20,
    defaultPoints: 'standard',
    defaultAnswerMode: 'single',
    questions: []
  };
  store.quizzes.push(newQuiz);
  store.currentId = newQuiz.id;
  saveStore();
  renderQuizList();
  renderQuestionList();
  openEditor(null);
});

deleteQuizBtn.addEventListener('click', ()=>{
  if(!store.currentId) return alert('No quiz selected');
  const idx = store.quizzes.findIndex(q=>q.id === store.currentId);
  if(idx < 0) return;
  if(!confirm('Delete this quiz and all its questions?')) return;
  store.quizzes.splice(idx,1);
  store.currentId = store.quizzes.length ? store.quizzes[0].id : null;
  saveStore();
  renderQuizList();
  renderQuestionList();
  openEditor(null);
});

/* Clicks in quiz list and question list */
quizList.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if(action === 'select' && id){
    setCurrentQuiz(id);
  }
});

questionList.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const quiz = getCurrentQuiz();
  if(!quiz) return;
  const q = quiz.questions.find(x=>x.id===id);
  if(!q) return;
  if(action === 'edit') openEditor(q);
});

/* Add question */
addQ.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('Select or create a quiz first');
  const q = { id: uid('q'), prompt:'', timeLimit:quiz.defaultTime || 20, type:'quiz', points:quiz.defaultPoints || 'standard', answerMode:quiz.defaultAnswerMode || 'single', choices:[
    { text:'', isCorrect:true }, { text:'', isCorrect:false }, { text:'', isCorrect:false }, { text:'', isCorrect:false }
  ]};
  quiz.questions.push(q);
  saveStore();
  renderQuestionList();
  openEditor(q);
});

/* Save question (also updates quiz title) */
saveBtn.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('Select or create a quiz first');
  const prompt = qPrompt.value.trim();
  const choicesEls = Array.from(answersGrid.querySelectorAll('.answer-input'));
  const checkEls = Array.from(answersGrid.querySelectorAll('.correct-checkbox'));
  const choices = choicesEls.map((el,i)=>({ text: el.value.trim(), isCorrect: checkEls[i].checked }));
  const filled = choices.filter(c=>c.text);
  if(!prompt || filled.length < 2 || !filled.some(c=>c.isCorrect)){
    alert('Please add a prompt, at least two answers, and mark one correct.');
    return;
  }

  const existing = editingId ? (quiz.questions.find(x=>x.id===editingId) || {}) : {};

  const qobj = {
    id: editingId || uid('q'),
    prompt,
    timeLimit: Number(qTime.value) || 20,
    type: qType.value,
    points: qPoints.value,
    answerMode: answerMode.value,
    choices,
    media: existing.media,
    mediaName: existing.mediaName
  };
  if(editingId){
    const i = quiz.questions.findIndex(x=>x.id===editingId);
    if(i>=0) quiz.questions[i] = qobj;
  } else {
    quiz.questions.push(qobj);
    editingId = qobj.id;
  }
  // update quiz title from input
  quiz.title = quizTitle.value.trim() || quiz.title;
  saveStore();
  renderQuizList();
  renderQuestionList();
  // update media name display
  if(mediaNameEl) mediaNameEl.textContent = qobj.mediaName || '';
  alert('Question saved');
});

/* Delete and duplicate question */
delBtn.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('No quiz selected');
  if(!editingId) return alert('No question selected');
  const idx = quiz.questions.findIndex(x=>x.id===editingId);
  if(idx>=0 && confirm('Delete this question?')){ quiz.questions.splice(idx,1); saveStore(); renderQuestionList(); openEditor(null); }
});
dupBtn.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('No quiz selected');
  if(!editingId) return alert('No question selected');
  const idx = quiz.questions.findIndex(x=>x.id===editingId);
  if(idx>=0){
    const copy = JSON.parse(JSON.stringify(quiz.questions[idx]));
    copy.id = uid('q');
    quiz.questions.splice(idx+1,0,copy);
    saveStore(); renderQuestionList();
  }
});

/* Media upload and drag/drop */
mediaDrop.addEventListener('click', ()=> mediaFile.click());
mediaDrop.addEventListener('keydown', (e)=> { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mediaFile.click(); } });

mediaFile.addEventListener('change', (ev)=>{
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const quiz = getCurrentQuiz();
    if(!quiz) return alert('No quiz selected');
    if(editingId){
      const q = quiz.questions.find(x=>x.id===editingId);
      if(q){
        q.media = e.target.result;
        q.mediaName = f.name;
        saveStore();
        if(mediaNameEl) mediaNameEl.textContent = f.name;
        alert('Media attached: ' + f.name);
      }
    } else {
      alert('Save the question first to attach media');
    }
  };
  reader.readAsDataURL(f);
  ev.target.value = '';
});

mediaDrop.addEventListener('dragover', (e)=>{ e.preventDefault(); mediaDrop.classList.add('drag'); });
mediaDrop.addEventListener('dragleave', ()=> mediaDrop.classList.remove('drag'));
mediaDrop.addEventListener('drop', (e)=> {
  e.preventDefault();
  mediaDrop.classList.remove('drag');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    const quiz = getCurrentQuiz();
    if(!quiz) return alert('No quiz selected');
    if(editingId){
      const q = quiz.questions.find(x=>x.id===editingId);
      if(q){
        q.media = ev.target.result;
        q.mediaName = f.name;
        saveStore();
        if(mediaNameEl) mediaNameEl.textContent = f.name;
        alert('Media attached: ' + f.name);
      }
    } else {
      alert('Save the question first to attach media');
    }
  };
  reader.readAsDataURL(f);
});

/* Apply settings */
applyBtn.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('No quiz selected');
  if(!editingId) return alert('No question selected');
  const q = quiz.questions.find(x=>x.id===editingId);
  if(q){
    q.type = qType.value; q.timeLimit = Number(qTime.value); q.points = qPoints.value; q.answerMode = answerMode.value;
    saveStore(); renderQuestionList(); alert('Settings applied');
  }
});

/* Apply to all: apply settings to all questions in current quiz and update quiz defaults */
applyAllBtn.addEventListener('click', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return alert('No quiz selected');

  // Apply question-level settings to every question in current quiz
  quiz.questions.forEach(q=>{
    q.type = qType.value;
    q.timeLimit = Number(qTime.value);
    q.points = qPoints.value;
    q.answerMode = answerMode.value;
  });

  // Update quiz defaults
  quiz.defaultTime = Number(qTime.value);
  quiz.defaultPoints = qPoints.value;
  quiz.defaultAnswerMode = answerMode.value;

  saveStore();
  renderQuizList();
  renderQuestionList();
  alert('Applied to all questions');
});

/* Preview */
previewBtn.addEventListener('click', ()=> {
  window.open('play.html','_blank');
});

/* Back button */
if(backBtn){
  backBtn.addEventListener('click', ()=> window.location.href = 'homepage.html');
}

/* Quiz title input: update current quiz title live */
quizTitle.addEventListener('blur', ()=>{
  const quiz = getCurrentQuiz();
  if(!quiz) return;
  quiz.title = quizTitle.value.trim() || quiz.title;
  saveStore();
  renderQuizList();
});

/* Init */
(function init(){
  if(!store.quizzes || !Array.isArray(store.quizzes)) store.quizzes = [];
  if(store.quizzes.length === 0){
    const defaultQuiz = { id: uid('quiz'), title: 'My Quiz', desc:'', defaultTime:20, defaultPoints:'standard', defaultAnswerMode:'single', questions: [] };
    store.quizzes.push(defaultQuiz);
    store.currentId = defaultQuiz.id;
    saveStore();
  }
  if(!store.currentId || !store.quizzes.find(q=>q.id===store.currentId)) store.currentId = store.quizzes[0].id;
  renderQuizList();
  renderQuestionList();
  openEditor(null);
})();
