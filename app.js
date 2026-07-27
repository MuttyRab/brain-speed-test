(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const E2E = new URLSearchParams(location.search).has('e2e');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = (normalMin, normalMax, testValue = 45) => E2E ? testValue : normalMin + Math.random() * (normalMax - normalMin);

  const colors = {
    RED: '#ff6d7a', BLUE: '#74a7ff', GREEN: '#5ce0a0', YELLOW: '#ffd45c'
  };

  let timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  const score = freshScore();
  function freshScore() {
    return {
      srt: { times: [], avg: 0, best: 0 },
      crt: { times: [], avg: 0, errors: 0 },
      stroop: { congruent: [], incongruent: [], correct: 0, accuracy: 0 },
      memory: { maxLevel: 1, points: 0 },
      gng: { goTimes: [], hits: 0, misses: 0, falseTaps: 0, held: 0, goCount: 0, noGoCount: 0 }
    };
  }
  function resetScore() {
    Object.assign(score, freshScore());
  }

  function showScreen(id) {
    clearTimers();
    $$('.screen').forEach((screen) => {
      screen.classList.remove('screen-active');
      screen.style.display = 'none';
    });
    const screen = document.getElementById(id);
    screen.style.display = 'block';
    requestAnimationFrame(() => screen.classList.add('screen-active'));
    scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function buildTrack(container, total) {
    container.innerHTML = '';
    for (let i = 0; i < total; i += 1) {
      const segment = document.createElement('span');
      segment.dataset.index = String(i);
      container.appendChild(segment);
    }
    updateTrack(container, 0, total);
  }
  function updateTrack(container, done, total, errorIndex = -1) {
    [...container.children].forEach((segment, index) => {
      segment.className = '';
      if (index < done) segment.classList.add('done');
      else if (index === done && done < total) segment.classList.add('active');
      if (index === errorIndex) segment.classList.add('error');
    });
  }

  function flash(element, text, color) {
    element.textContent = text;
    element.style.color = color;
    element.classList.remove('show');
    void element.offsetWidth;
    element.classList.add('show');
  }

  function setTheme(light) {
    document.documentElement.classList.toggle('light', light);
    document.querySelector('meta[name="theme-color"]').content = light ? '#f4f7fb' : '#060812';
    try { localStorage.setItem('brain-speed-theme', light ? 'light' : 'dark'); } catch (_) {}
  }
  try { setTheme(localStorage.getItem('brain-speed-theme') === 'light'); } catch (_) {}
  $('#theme-toggle').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('light')));

  $('#start-battery').addEventListener('click', () => showScreen('screen-srt'));
  $('#brand-home').addEventListener('click', (event) => { event.preventDefault(); restartAll(); });
  $('#restart-top').addEventListener('click', restartAll);

  const srt = { round: 0, total: 5, waiting: false, live: false, startedAt: 0, timer: null };
  const srtReady = $('#srt-ready');
  const srtRun = $('#srt-run');
  const srtTarget = $('#srt-target');
  const srtStandby = $('#srt-standby');
  const srtArena = $('#srt-arena');
  const srtFeedback = $('#srt-feedback');
  const srtTrack = $('#srt-track');

  $('#begin-srt').addEventListener('click', startSrt);
  function startSrt() {
    hide(srtReady); show(srtRun);
    score.srt.times = [];
    Object.assign(srt, { round: 0, waiting: false, live: false });
    buildTrack(srtTrack, srt.total);
    scheduleSrt();
  }
  function scheduleSrt() {
    srt.live = false; srt.waiting = true;
    hide(srtTarget); show(srtStandby);
    $('#srt-round').textContent = `${srt.round + 1} / ${srt.total}`;
    updateTrack(srtTrack, srt.round, srt.total);
    srt.timer = later(() => {
      srt.waiting = false; srt.live = true;
      hide(srtStandby); show(srtTarget);
      srt.startedAt = performance.now();
    }, delay(1200, 4000));
  }
  function earlySrt() {
    if (!srt.waiting) return;
    clearTimeout(srt.timer); timers.delete(srt.timer);
    srt.waiting = false;
    hide(srtStandby);
    flash(srtFeedback, 'TOO EARLY', 'var(--bad)');
    later(scheduleSrt, E2E ? 30 : 850);
  }
  srtArena.addEventListener('pointerdown', (event) => {
    if (event.target === srtTarget || srtTarget.contains(event.target)) return;
    earlySrt();
  });
  srtTarget.addEventListener('pointerdown', (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!srt.live) return;
    srt.live = false;
    const value = Math.max(1, Math.round(performance.now() - srt.startedAt));
    score.srt.times.push(value);
    hide(srtTarget);
    flash(srtFeedback, `${value} ms`, 'var(--accent)');
    srt.round += 1;
    updateTrack(srtTrack, srt.round, srt.total);
    if (srt.round < srt.total) later(scheduleSrt, E2E ? 25 : 420);
    else later(finishSrt, E2E ? 35 : 700);
  });
  function finishSrt() {
    score.srt.avg = Math.round(score.srt.times.reduce((a, b) => a + b, 0) / score.srt.times.length);
    score.srt.best = Math.min(...score.srt.times);
    showScreen('screen-crt');
  }

  const choicePalette = ['#b8ff62', '#74a7ff', '#5ce0a0', '#ffd45c'];
  const crt = { round: 0, total: 6, waiting: false, live: false, target: -1, startedAt: 0, timer: null };
  const crtReady = $('#crt-ready');
  const crtRun = $('#crt-run');
  const crtStandby = $('#crt-standby');
  const choiceGrid = $('#choice-grid');
  const choiceButtons = $$('.choice-button');
  const crtFeedback = $('#crt-feedback');
  const crtTrack = $('#crt-track');
  const choiceArena = $('.choice-arena');

  $('#begin-crt').addEventListener('click', startCrt);
  function startCrt() {
    hide(crtReady); show(crtRun);
    score.crt.times = []; score.crt.errors = 0;
    Object.assign(crt, { round: 0, waiting: false, live: false, target: -1 });
    buildTrack(crtTrack, crt.total);
    scheduleCrt();
  }
  function dimChoices() {
    choiceButtons.forEach((button, index) => {
      button.classList.remove('active');
      button.style.setProperty('--choice', choicePalette[index]);
    });
  }
  function scheduleCrt() {
    crt.live = false; crt.waiting = true;
    dimChoices(); hide(choiceGrid); show(crtStandby);
    $('#crt-round').textContent = `${crt.round + 1} / ${crt.total}`;
    updateTrack(crtTrack, crt.round, crt.total);
    crt.timer = later(() => {
      crt.waiting = false; crt.live = true;
      crt.target = Math.floor(Math.random() * 4);
      hide(crtStandby); show(choiceGrid);
      dimChoices(); choiceButtons[crt.target].classList.add('active');
      crt.startedAt = performance.now();
    }, delay(800, 2800));
  }
  choiceArena.addEventListener('pointerdown', (event) => {
    if (!crt.waiting || event.target.closest('.choice-button')) return;
    clearTimeout(crt.timer); timers.delete(crt.timer); crt.waiting = false;
    hide(crtStandby); flash(crtFeedback, 'WAIT FOR THE SIGNAL', 'var(--bad)');
    later(scheduleCrt, E2E ? 25 : 700);
  });
  choiceButtons.forEach((button, index) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!crt.live) return;
      crt.live = false;
      const reaction = Math.max(1, Math.round(performance.now() - crt.startedAt));
      const correct = index === crt.target;
      if (correct) {
        score.crt.times.push(reaction);
        flash(crtFeedback, `${reaction} ms`, 'var(--accent)');
      } else {
        score.crt.errors += 1;
        score.crt.times.push(reaction + 200);
        flash(crtFeedback, 'INCORRECT +200 ms', 'var(--bad)');
      }
      button.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }], { duration: 230, easing: 'ease-out' });
      crt.round += 1;
      updateTrack(crtTrack, crt.round, crt.total, correct ? -1 : crt.round - 1);
      if (crt.round < crt.total) later(scheduleCrt, E2E ? 25 : 430);
      else later(finishCrt, E2E ? 35 : 720);
    });
  });
  function finishCrt() {
    score.crt.avg = Math.round(score.crt.times.reduce((a, b) => a + b, 0) / score.crt.times.length);
    showScreen('screen-stroop');
  }

  const words = Object.keys(colors);
  const stroop = { round: 0, total: 8, live: false, answer: '', congruent: false, startedAt: 0 };
  const stroopReady = $('#stroop-ready');
  const stroopRun = $('#stroop-run');
  const stroopWord = $('#stroop-word');
  const stroopFeedback = $('#stroop-feedback');
  const stroopTrack = $('#stroop-track');

  $('#begin-stroop').addEventListener('click', startStroop);
  function startStroop() {
    hide(stroopReady); show(stroopRun);
    score.stroop.congruent = []; score.stroop.incongruent = []; score.stroop.correct = 0;
    stroop.round = 0;
    buildTrack(stroopTrack, stroop.total);
    nextStroop();
  }
  function nextStroop() {
    stroop.live = false; stroopFeedback.textContent = '';
    const word = words[Math.floor(Math.random() * words.length)];
    stroop.congruent = Math.random() > .5;
    const others = words.filter((item) => item !== word);
    stroop.answer = stroop.congruent ? word : others[Math.floor(Math.random() * others.length)];
    stroopWord.textContent = word;
    stroopWord.style.color = colors[stroop.answer];
    stroopWord.dataset.answer = stroop.answer;
    stroopWord.style.animation = 'none'; void stroopWord.offsetWidth; stroopWord.style.animation = '';
    $('#stroop-round').textContent = `${stroop.round + 1} / ${stroop.total}`;
    updateTrack(stroopTrack, stroop.round, stroop.total);
    stroop.startedAt = performance.now(); stroop.live = true;
  }
  $$('.stroop-options button').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!stroop.live) return;
      stroop.live = false;
      const reaction = Math.max(1, Math.round(performance.now() - stroop.startedAt));
      const correct = button.dataset.color === stroop.answer;
      const list = stroop.congruent ? score.stroop.congruent : score.stroop.incongruent;
      list.push(correct ? reaction : reaction + 250);
      if (correct) {
        score.stroop.correct += 1;
        stroopFeedback.style.color = 'var(--good)'; stroopFeedback.textContent = '✓ CORRECT';
      } else {
        stroopFeedback.style.color = 'var(--bad)'; stroopFeedback.textContent = `✕ ${stroop.answer} INK`;
      }
      stroop.round += 1;
      updateTrack(stroopTrack, stroop.round, stroop.total, correct ? -1 : stroop.round - 1);
      if (stroop.round < stroop.total) later(nextStroop, E2E ? 20 : 520);
      else later(finishStroop, E2E ? 30 : 700);
    });
  });
  function finishStroop() {
    score.stroop.accuracy = Math.round((score.stroop.correct / stroop.total) * 100);
    showScreen('screen-memory');
  }

  const memory = { level: 1, lives: 3, points: 0, maxLevel: 1, sequence: [], input: [], phase: 'idle', size: 3 };
  const memoryReady = $('#memory-ready');
  const memoryRun = $('#memory-run');
  const memoryGrid = $('#memory-grid');

  $('#begin-memory').addEventListener('click', startMemory);
  function startMemory() {
    hide(memoryReady); show(memoryRun);
    Object.assign(memory, { level: 1, lives: 3, points: 0, maxLevel: 1, sequence: [], input: [], phase: 'idle', size: 3 });
    updateMemoryMetrics(); buildMemoryGrid();
    later(memoryRound, E2E ? 20 : 500);
  }
  function updateMemoryMetrics() {
    $('#memory-level').textContent = memory.level;
    $('#memory-score').textContent = memory.points;
    $('#memory-lives').textContent = `${'● '.repeat(memory.lives)}${'○ '.repeat(3 - memory.lives)}`.trim();
  }
  function buildMemoryGrid() {
    memory.size = Math.min(3 + Math.floor((memory.level - 1) / 2), 5);
    const available = Math.min(innerWidth - 90, 370);
    const cell = Math.max(44, Math.min(70, Math.floor((available - (memory.size - 1) * 12) / memory.size)));
    memoryGrid.style.setProperty('--cell', `${cell}px`);
    memoryGrid.style.gridTemplateColumns = `repeat(${memory.size}, ${cell}px)`;
    memoryGrid.innerHTML = '';
    for (let index = 0; index < memory.size * memory.size; index += 1) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'memory-cell'; button.dataset.index = String(index); button.setAttribute('aria-label', `Memory cell ${index + 1}`);
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); memoryTap(index, button); });
      memoryGrid.appendChild(button);
    }
  }
  function memoryRound() {
    memory.sequence = [];
    const length = Math.min(2 + memory.level, 9);
    const count = memory.size * memory.size;
    for (let i = 0; i < length; i += 1) memory.sequence.push(Math.floor(Math.random() * count));
    memory.input = []; memory.phase = 'watch';
    $('#memory-instruction').textContent = 'Watch the pattern';
    $('#memory-phase').textContent = 'OBSERVE';
    playMemoryStep(0);
  }
  function playMemoryStep(position) {
    if (position >= memory.sequence.length) {
      memory.phase = 'input';
      $('#memory-instruction').textContent = 'Repeat the sequence';
      $('#memory-phase').textContent = 'YOUR TURN';
      return;
    }
    const cell = memoryGrid.children[memory.sequence[position]];
    cell.classList.add('lit');
    later(() => {
      cell.classList.remove('lit');
      later(() => playMemoryStep(position + 1), E2E ? 8 : 170);
    }, E2E ? 12 : Math.max(250, 510 - memory.level * 26));
  }
  function memoryTap(index, cell) {
    if (memory.phase !== 'input') return;
    cell.classList.add('hit'); later(() => cell.classList.remove('hit'), E2E ? 15 : 210);
    memory.input.push(index);
    const expected = memory.sequence[memory.input.length - 1];
    if (index !== expected) {
      memory.phase = 'locked'; memory.lives -= 1;
      cell.classList.add('wrong'); later(() => cell.classList.remove('wrong'), E2E ? 20 : 420);
      $('#memory-instruction').textContent = 'Sequence mismatch';
      $('#memory-phase').textContent = 'LIFE LOST';
      updateMemoryMetrics();
      if (memory.lives <= 0) later(finishMemory, E2E ? 30 : 700);
      else later(() => { memory.level = Math.max(1, memory.level - 1); buildMemoryGrid(); updateMemoryMetrics(); memoryRound(); }, E2E ? 35 : 900);
      return;
    }
    if (memory.input.length === memory.sequence.length) {
      memory.phase = 'locked'; memory.points += memory.level * 10; memory.maxLevel = Math.max(memory.maxLevel, memory.level);
      memory.level += 1; updateMemoryMetrics();
      $('#memory-instruction').textContent = 'Sequence confirmed'; $('#memory-phase').textContent = 'LEVEL UP';
      later(() => { buildMemoryGrid(); memoryRound(); }, E2E ? 35 : 750);
    }
  }
  function finishMemory() {
    score.memory.maxLevel = memory.maxLevel;
    score.memory.points = memory.points;
    showScreen('screen-gng');
  }

  const gng = { round: 0, total: 15, waiting: false, live: false, mode: 'go', startedAt: 0, timer: null, responseTimer: null };
  const gngReady = $('#gng-ready');
  const gngRun = $('#gng-run');
  const gngTarget = $('#gng-target');
  const gngStandby = $('#gng-standby');
  const gngFeedback = $('#gng-feedback');
  const gngTrack = $('#gng-track');
  const controlArena = $('.control-arena');

  $('#begin-gng').addEventListener('click', startGng);
  function startGng() {
    hide(gngReady); show(gngRun);
    Object.assign(score.gng, { goTimes: [], hits: 0, misses: 0, falseTaps: 0, held: 0, goCount: 0, noGoCount: 0 });
    Object.assign(gng, { round: 0, waiting: false, live: false, mode: 'go' });
    buildTrack(gngTrack, gng.total); updateGngMetrics();
    scheduleGng();
  }
  function scheduleGng() {
    gng.live = false; gng.waiting = true;
    hide(gngTarget); show(gngStandby);
    $('#gng-round').textContent = `${gng.round} / ${gng.total}`;
    updateTrack(gngTrack, gng.round, gng.total);
    gng.timer = later(() => {
      gng.waiting = false; gng.live = true;
      gng.mode = Math.random() < .65 ? 'go' : 'stop';
      if (gng.mode === 'go') score.gng.goCount += 1; else score.gng.noGoCount += 1;
      const color = gng.mode === 'go' ? 'var(--good)' : 'var(--bad)';
      gngTarget.style.setProperty('--target-color', color);
      gngTarget.dataset.mode = gng.mode;
      $('#gng-label').textContent = gng.mode === 'go' ? 'TAP' : 'HOLD';
      hide(gngStandby); show(gngTarget);
      gng.startedAt = performance.now();
      gng.responseTimer = later(autoGng, E2E ? 120 : 950);
    }, delay(700, 2700));
  }
  controlArena.addEventListener('pointerdown', (event) => {
    if (!gng.waiting || event.target === gngTarget || gngTarget.contains(event.target)) return;
    clearTimeout(gng.timer); timers.delete(gng.timer); gng.waiting = false;
    hide(gngStandby); flash(gngFeedback, 'TOO EARLY', 'var(--bad)');
    later(scheduleGng, E2E ? 25 : 720);
  });
  gngTarget.addEventListener('pointerdown', (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!gng.live) return;
    gng.live = false; clearTimeout(gng.responseTimer); timers.delete(gng.responseTimer);
    const reaction = Math.max(1, Math.round(performance.now() - gng.startedAt));
    if (gng.mode === 'go') {
      score.gng.hits += 1; score.gng.goTimes.push(reaction);
      flash(gngFeedback, `${reaction} ms`, 'var(--good)');
    } else {
      score.gng.falseTaps += 1;
      flash(gngFeedback, 'FALSE TAP', 'var(--bad)');
    }
    completeGngTrial();
  });
  function autoGng() {
    if (!gng.live) return;
    gng.live = false;
    if (gng.mode === 'go') {
      score.gng.misses += 1; flash(gngFeedback, 'MISSED', 'var(--bad)');
    } else {
      score.gng.held += 1; flash(gngFeedback, 'CONTROLLED', 'var(--accent)');
    }
    completeGngTrial();
  }
  function completeGngTrial() {
    hide(gngTarget); gng.round += 1;
    updateGngMetrics(); updateTrack(gngTrack, gng.round, gng.total);
    $('#gng-round').textContent = `${gng.round} / ${gng.total}`;
    if (gng.round < gng.total) later(scheduleGng, E2E ? 20 : 380);
    else later(finishGng, E2E ? 30 : 720);
  }
  function updateGngMetrics() {
    $('#gng-hits').textContent = score.gng.hits;
    $('#gng-misses').textContent = score.gng.misses;
    $('#gng-false').textContent = score.gng.falseTaps;
    $('#gng-held').textContent = score.gng.held;
  }
  function finishGng() { showScreen('screen-results'); renderResults(); }

  const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, value));
  const average = (list) => list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
  function grade(value) {
    if (value >= 80) return ['Excellent', 'Outstanding speed and control across the battery.'];
    if (value >= 65) return ['Strong', 'A notably quick overall performance with room to sharpen a few dimensions.'];
    if (value >= 45) return ['Typical', 'Your result falls within a broad, healthy adult range.'];
    return ['Developing', 'Fatigue, distraction, or unfamiliarity may have affected this attempt.'];
  }
  function renderResults() {
    const s1 = clamp(Math.round(100 - ((score.srt.avg - 160) / 260) * 80));
    const s2 = clamp(Math.round(100 - ((score.crt.avg - 250) / 350) * 80));
    const s3 = score.stroop.accuracy;
    const s4 = clamp(Math.round((score.memory.points / 120) * 100));
    const hitRate = score.gng.goCount ? (score.gng.hits / score.gng.goCount) * 100 : 0;
    const controlRate = score.gng.noGoCount ? (score.gng.held / score.gng.noGoCount) * 100 : 100;
    const s5 = clamp(Math.round(hitRate * .5 + controlRate * .5));
    const overall = Math.round((s1 + s2 + s3 + s4 + s5) / 5);
    const [label, description] = grade(overall);
    const congruent = average(score.stroop.congruent);
    const incongruent = average(score.stroop.incongruent);

    const cards = [
      resultCard('↯', 'Raw reaction', 'Visual response latency', s1, '#b8ff62', [['AVERAGE', `${score.srt.avg} ms`], ['BEST', `${score.srt.best} ms`], ['REFERENCE', '249 ms']], `Your mean reaction time was ${score.srt.avg} ms across five trials.`),
      resultCard('◇', 'Decision speed', 'Four-choice processing', s2, '#74a7ff', [['AVERAGE', `${score.crt.avg} ms`], ['ERRORS', `${score.crt.errors} / 6`], ['REFERENCE', '390 ms']], `Choice speed includes a 200 ms penalty for each incorrect response.`),
      resultCard('≋', 'Colour focus', 'Interference control', s3, '#8f7cff', [['ACCURACY', `${score.stroop.accuracy}%`], ['MATCHED', `${congruent} ms`], ['CLASHED', `${incongruent} ms`]], `The ${Math.max(0, incongruent - congruent)} ms difference is your measured interference effect.`),
      resultCard('▦', 'Short-term memory', 'Spatial sequence span', s4, '#ffd45c', [['MAX LEVEL', `${score.memory.maxLevel}`], ['POINTS', `${score.memory.points}`], ['REFERENCE', 'Level 5–6']], `You reached level ${score.memory.maxLevel} before using all three lives.`),
      resultCard('⊘', 'Self-control', 'Response inhibition', s5, '#5ce0a0', [['HIT RATE', `${Math.round(hitRate)}%`], ['FALSE TAPS', `${score.gng.falseTaps}`], ['HELD BACK', `${Math.round(controlRate)}%`]], `You correctly withheld on ${Math.round(controlRate)}% of red signals.`)
    ].join('');

    $('#results-content').innerHTML = `
      <div class="results-layout">
        <section class="score-panel">
          <div class="score-ring">
            <svg viewBox="0 0 210 210" aria-hidden="true">
              <defs><linearGradient id="score-gradient"><stop offset="0" stop-color="#b8ff62"/><stop offset="1" stop-color="#74e7ff"/></linearGradient></defs>
              <circle class="ring-bg" cx="105" cy="105" r="96"></circle>
              <circle class="ring-progress" cx="105" cy="105" r="96" data-score="${overall}"></circle>
            </svg>
            <div class="score-value"><b id="score-number">0</b><span>OUT OF 100</span></div>
          </div>
          <div class="score-grade"><b>${label}</b><p>${description}</p></div>
        </section>
        <div class="results-details">${cards}</div>
      </div>
      <div class="research-box">
        <button class="research-toggle" id="research-toggle" type="button"><span>Research references and benchmark context</span><i>+</i></button>
        <div class="research-body" id="research-body">
          <p><strong>Reaction speed:</strong> MindCrowd large-sample reaction-time research; adult mean used here ≈249 ms.</p>
          <p><strong>Decision speed:</strong> Hick–Hyman choice reaction principles and Deary–Liewald four-choice reaction measures.</p>
          <p><strong>Focus:</strong> The classic Stroop interference paradigm, comparing congruent and incongruent color-word trials.</p>
          <p><strong>Memory:</strong> Corsi-style spatial sequence recall; typical adult spans often cluster around five to six items.</p>
          <p><strong>Control:</strong> Go/No-Go response inhibition, tracking hit rate and commission errors.</p>
        </div>
      </div>`;

    requestAnimationFrame(() => {
      const ring = $('.ring-progress');
      ring.style.strokeDashoffset = String(603 - (603 * overall / 100));
      $$('.result-bar span').forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; });
      animateNumber($('#score-number'), overall, E2E ? 80 : 1300);
    });
    $('#research-toggle').addEventListener('click', function () {
      this.classList.toggle('open'); $('#research-body').classList.toggle('open');
    });
  }
  function resultCard(icon, title, subtitle, value, color, metrics, description) {
    return `<article class="result-card" style="--card-color:${color}">
      <div class="result-top"><div class="result-icon">${icon}</div><div class="result-title"><h3>${title}</h3><span>${subtitle}</span></div><div class="result-score"><b>${value}</b><span>/ 100</span></div></div>
      <div class="result-bar"><span data-width="${Math.max(3, value)}"></span></div>
      <div class="result-body"><div class="result-metrics">${metrics.map(([key, val]) => `<div><span>${key}</span><b>${val}</b></div>`).join('')}</div><p>${description}</p></div>
    </article>`;
  }
  function animateNumber(element, target, duration) {
    const started = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function restartAll() {
    clearTimers(); resetScore();
    [
      [srtReady, srtRun], [crtReady, crtRun], [stroopReady, stroopRun], [memoryReady, memoryRun], [gngReady, gngRun]
    ].forEach(([ready, run]) => { show(ready); hide(run); });
    hide(srtTarget); hide(choiceGrid); hide(gngTarget);
    showScreen('screen-intro');
  }

  function initNeuralCanvas() {
    if (reducedMotion) return;
    const canvas = $('#neural-canvas');
    const context = canvas.getContext('2d');
    let points = [];
    function resize() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(48, Math.max(20, Math.floor(innerWidth / 28)));
      points = Array.from({ length: count }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16 }));
    }
    function frame() {
      context.clearRect(0, 0, innerWidth, innerHeight);
      const light = document.documentElement.classList.contains('light');
      points.forEach((point) => {
        point.x += point.vx; point.y += point.vy;
        if (point.x < -20 || point.x > innerWidth + 20) point.vx *= -1;
        if (point.y < -20 || point.y > innerHeight + 20) point.vy *= -1;
      });
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            context.strokeStyle = light ? `rgba(55,76,102,${(1 - dist / 150) * .07})` : `rgba(133,166,211,${(1 - dist / 150) * .08})`;
            context.lineWidth = .7; context.beginPath(); context.moveTo(points[i].x, points[i].y); context.lineTo(points[j].x, points[j].y); context.stroke();
          }
        }
        context.fillStyle = light ? 'rgba(53,78,108,.17)' : 'rgba(184,255,98,.2)';
        context.beginPath(); context.arc(points[i].x, points[i].y, 1.1, 0, Math.PI * 2); context.fill();
      }
      requestAnimationFrame(frame);
    }
    resize(); addEventListener('resize', resize, { passive: true }); frame();
  }
  initNeuralCanvas();

  if (E2E) {
    window.__BST_DEBUG__ = {
      get screen() { return $('.screen-active')?.id || ''; },
      get memorySequence() { return [...memory.sequence]; },
      get memoryPhase() { return memory.phase; },
      get gngMode() { return gng.mode; },
      get score() { return JSON.parse(JSON.stringify(score)); }
    };
  }
})();
