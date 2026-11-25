/* SIHAYA — lógica principal do aplicativo. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id),
    pad = (n) => String(n).padStart(2, '0');
  const FEEDBACK_MAX = 1000;
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseDate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  };
  const weekNames = {
      segunda: 'Segunda-feira',
      terca: 'Terça-feira',
      quarta: 'Quarta-feira',
      quinta: 'Quinta-feira',
      sexta: 'Sexta-feira',
      sabado: 'Sábado',
      domingo: 'Domingo',
    },
    dayOffsets = { segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6 };
  const allDays = Object.keys(dayOffsets),
    defaults = ['segunda', 'quarta', 'sexta'];
  const weekdayOf = (date) => {
    const dt = parseDate(date);
    return allDays[(dt.getDay() + 6) % 7];
  };
  const dateOfCurrentWeek = (d) => {
    const x = new Date(),
      dow = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - dow + dayOffsets[d]);
    return iso(x);
  };
  const legExercises = [
    ['Cadeira extensora', '12–15'],
    ['Mesa flexora', '12–15'],
    ['Abdutor', '15'],
    ['Adutor', '15'],
    ['Leg Press', '12–15'],
    ['Panturrilha sentado ou em pé', '15–20'],
  ];
  const upperExercises = [
    ['Puxada frontal na polia (costas)', '12–15'],
    ['Remada sentada na polia (costas)', '12–15'],
    ['Supino máquina ou chest press', '12–15'],
    ['Desenvolvimento de ombros na máquina', '12–15'],
    ['Rosca bíceps na máquina ou halteres leves', '12–15'],
    ['Tríceps pulley (barra ou corda)', '12–15'],
  ];
  // Programas por nível (js/programs.js). Sem eles, usa as listas antigas.
  const PROGRAMS = self.SIHAYA_PROGRAMS || {},
    LEVELS = self.SIHAYA_LEVEL_ORDER || [];
  const programTemplate = (level, d) =>
    (PROGRAMS[level]?.days?.[d]?.exercises || []).map(([name, reps, count, rest], i) => ({
      id: `${level}-${d}-${i}`,
      name,
      reps,
      count,
      rest,
    }));
  const defaultConfig = (d) =>
    PROGRAMS.iniciante
      ? programTemplate('iniciante', d)
      : (d === 'quarta' ? upperExercises : defaults.includes(d) ? legExercises : []).map(
          ([name, reps], i) => ({ id: d + '-' + i, name, reps, count: 2, rest: 75 }),
        );
  const newKey = 'kanban-lavanda-semanal-v3',
    oldKey = 'kanban-pernas-v2';
  const emptySet = () => ({ done: false, load: '', reps: '' });
  const bounded = (v, fallback, min, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  const normalizedExercise = (raw, i, d) => ({
    id: String(raw?.id || d + '-' + i),
    name: String(
      raw?.name || (d === 'quarta' ? upperExercises : legExercises)[i]?.[0] || 'Exercício',
    ),
    reps: String(
      raw?.repsTarget || (d === 'quarta' ? upperExercises : legExercises)[i]?.[1] || '12–15',
    ),
    count: bounded(raw?.count || raw?.sets?.length, 2, 1, 12),
    rest: bounded(raw?.rest, 75, 15, 600),
    sets: Array.isArray(raw?.sets)
      ? raw.sets.map((s) => ({
          done: !!s?.done,
          load: String(s?.load ?? ''),
          reps: String(s?.reps ?? ''),
        }))
      : Array.isArray(raw?.checks)
        ? raw.checks.map((v) => ({ done: !!v, load: String(raw.load ?? ''), reps: '' }))
        : [],
  });
  const fromConfig = (c) => ({
    id: c.id,
    name: c.name,
    repsTarget: c.reps,
    count: c.count,
    rest: c.rest,
    sets: Array.from({ length: c.count }, emptySet),
  });
  const cleanSession = (raw, d) => {
    const exs = Array.isArray(raw?.exercises) ? raw.exercises : Array.isArray(raw) ? raw : [];
    return {
      day: d,
      workoutName: String(raw?.workoutName || ''),
      exercises: exs.map((x, i) => {
        const a = normalizedExercise(x, i, d);
        return {
          ...a,
          repsTarget: a.reps,
          sets: Array.from({ length: a.count }, (_, j) => a.sets[j] || emptySet()),
        };
      }),
      // Sintomas: mantidos apenas como histórico de registros antigos.
      symptoms: {
        before: { ...(raw?.symptoms?.before || {}) },
        after: { ...(raw?.symptoms?.after || {}) },
      },
      feedback: String(raw?.feedback || '').slice(0, FEEDBACK_MAX),
    };
  };
  let app = {
    sessions: {},
    theme: 'light',
    customColors: { light: null, dark: null },
    templates: {},
    restQuick: [60, 90],
    activeDays: [...defaults],
    dayTitles: {},
  };
  let oldData = null;
  try {
    const p = JSON.parse(localStorage.getItem(newKey));
    if (p?.sessions && typeof p.sessions === 'object') app = { ...app, ...p };
  } catch (e) {}
  try {
    oldData = JSON.parse(localStorage.getItem(oldKey));
  } catch (e) {}
  app.activeDays = Array.isArray(app.activeDays)
    ? [...new Set(app.activeDays.filter((d) => allDays.includes(d)))].sort(
        (a, b) => dayOffsets[a] - dayOffsets[b],
      )
    : [...defaults];
  if (!app.activeDays.length) app.activeDays = [...defaults];
  app.dayTitles = app.dayTitles && typeof app.dayTitles === 'object' ? app.dayTitles : {};
  for (const d of allDays)
    if (!app.dayTitles[d])
      app.dayTitles[d] =
        PROGRAMS.iniciante?.days?.[d]?.title ||
        (d === 'quarta' ? 'Superiores' : defaults.includes(d) ? 'Inferiores' : 'Treino');
  for (const d of allDays) {
    const list = app.templates?.[d];
    app.templates[d] = Array.isArray(list)
      ? list.map((e, i) => ({
          id: String(e.id || d + '-' + i),
          name: String(e.name || 'Exercício'),
          reps: String(e.reps || '12–15'),
          count: bounded(e.count, 2, 1, 12),
          rest: bounded(e.rest, 75, 15, 600),
        }))
      : defaultConfig(d);
  }
  app.restQuick = Array.isArray(app.restQuick)
    ? app.restQuick.slice(0, 2).map((v, i) => bounded(v, i ? 90 : 60, 15, 600))
    : [60, 90];
  if (!app.migrated) {
    for (const d of defaults) {
      const date = dateOfCurrentWeek(d);
      if (!app.sessions[date] && Array.isArray(oldData?.[d]))
        app.sessions[date] = cleanSession(oldData[d], d);
    }
    app.migrated = true;
  }
  for (const [date, s] of Object.entries(app.sessions)) {
    const d = weekdayOf(date) || s.day || 'segunda';
    app.sessions[date] = cleanSession(s, d);
  }
  // Migração apenas do título padrão; preserva nomes personalizados e dados de treino.
  for (const d of ['segunda', 'sexta'])
    if (app.dayTitles[d] === 'Pernas') app.dayTitles[d] = 'Inferiores';
  for (const s of Object.values(app.sessions))
    if (['segunda', 'sexta'].includes(s.day) && s.workoutName === 'Pernas')
      s.workoutName = 'Inferiores';
  // Nível: quem já usava o app começa como Iniciante, contando desde o primeiro registro.
  if (!app.level || !PROGRAMS[app.level.id] || !/^\d{4}-\d\d-\d\d$/.test(app.level.since || ''))
    app.level = {
      id: PROGRAMS[app.level?.id] ? app.level.id : 'iniciante',
      since: Object.keys(app.sessions).sort()[0] || iso(new Date()),
    };
  let theme = app.theme === 'dark' ? 'dark' : 'light';
  // Ao abrir: o treino de hoje; se hoje não for dia de treino, o próximo dia programado.
  function openingDate() {
    const x = new Date();
    for (let i = 0; i < 7; i++) {
      const date = iso(x);
      if (app.activeDays.includes(weekdayOf(date))) return date;
      x.setDate(x.getDate() + 1);
    }
    return dateOfCurrentWeek(app.activeDays[0]);
  }
  let sessionDate = openingDate(),
    day = weekdayOf(sessionDate),
    remaining = 60,
    timer = null,
    last = 0,
    transitioning = false;
  let calendarMonth = new Date(),
    chartDay = app.activeDays[0],
    chartEx = '',
    editingId = null,
    editingDay = null;
  const metrics = [
    ['dor', 'Dor'],
    ['inchaco', 'Inchaço'],
    ['peso', 'Peso nas pernas'],
    ['cansaco', 'Cansaço'],
  ];
  function toast(s) {
    $('toast').textContent = s;
    $('toast').classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => $('toast').classList.remove('show'), 2400);
  }
  function save() {
    try {
      localStorage.setItem(newKey, JSON.stringify(app));
      window.dispatchEvent(new CustomEvent('sihaya:data-changed'));
    } catch (e) {
      toast('Não foi possível salvar os dados neste navegador.');
    }
  }
  function current() {
    if (!app.sessions[sessionDate])
      app.sessions[sessionDate] = {
        day,
        workoutName: app.dayTitles[day],
        exercises: (app.templates[day] || []).map(fromConfig),
        symptoms: { before: {}, after: {} },
        feedback: '',
      };
    return app.sessions[sessionDate];
  }
  function countDone(s) {
    return s.exercises.reduce((n, x) => n + x.sets.filter((a) => a.done).length, 0);
  }
  function totalSets(s) {
    return s.exercises.reduce((n, x) => n + x.sets.length, 0);
  }
  function stage(x) {
    const n = x.sets.filter((s) => s.done).length;
    return n === x.sets.length ? 'done' : n ? 'doing' : 'todo';
  }
  function recordedSession(x) {
    return (
      x?.exercises?.some((ex) =>
        ex?.sets?.some((s) => s.done || s.load?.trim() || s.reps?.trim()),
      ) ||
      hasSymptoms(x) ||
      !!String(x?.feedback || '').trim()
    );
  }
  function hasSymptoms(x) {
    return (
      Object.values(x?.symptoms?.before || {}).some((v) => v !== '') ||
      Object.values(x?.symptoms?.after || {}).some((v) => v !== '')
    );
  }
  function sessionComplete(s) {
    const total = totalSets(s);
    return total > 0 && countDone(s) === total;
  }
  function commit() {
    save();
    renderCalendar();
    renderChart();
    if ($('reportsBody') && !$('reportsBody').hidden) renderReports();
    else {
      if ($('comparisonBody') && !$('comparisonBody').hidden) renderComparison();
      if ($('analysisBody') && !$('analysisBody').hidden) renderSymptomAnalysis();
    }
  }
  const colorDefaults = {
    light: { accent: '#8052c6', background: '#f7f4fb', card: '#ffffff', text: '#2d2340' },
    dark: { accent: '#c5a0ff', background: '#191522', card: '#241d30', text: '#f3ebff' },
  };
  const palettes = {
    lavanda: { label: 'Lavanda original', dot: '#8052c6', light: null, dark: null },
    rosa: {
      label: 'Rosa',
      dot: '#bf5587',
      light: { accent: '#ae4379', background: '#fff5fa', card: '#ffffff', text: '#3e2538' },
      dark: { accent: '#f59bc7', background: '#21151d', card: '#30202a', text: '#fff0f7' },
    },
    azul: {
      label: 'Azul',
      dot: '#477bc7',
      light: { accent: '#3269b4', background: '#f3f7ff', card: '#ffffff', text: '#23314a' },
      dark: { accent: '#91b8fc', background: '#111b2c', card: '#1c2a40', text: '#edf4ff' },
    },
    verde: {
      label: 'Verde',
      dot: '#398f7b',
      light: { accent: '#237a68', background: '#f2faf6', card: '#ffffff', text: '#203c34' },
      dark: { accent: '#8bd7bb', background: '#13221e', card: '#20332c', text: '#ecfff3' },
    },
    pesego: {
      label: 'Pêssego',
      dot: '#cc7654',
      light: { accent: '#ac5a3f', background: '#fff7f2', card: '#ffffff', text: '#442d2b' },
      dark: { accent: '#f0a78e', background: '#281c1b', card: '#382925', text: '#fff0e9' },
    },
  };
  function validColor(v) {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  }
  function cleanColors(x) {
    if (!x || typeof x !== 'object') return null;
    const o = {};
    for (const key of ['accent', 'background', 'card', 'text']) {
      if (!validColor(x[key])) return null;
      o[key] = x[key].toLowerCase();
    }
    return o;
  }
  app.customColors =
    app.customColors && typeof app.customColors === 'object'
      ? { light: cleanColors(app.customColors.light), dark: cleanColors(app.customColors.dark) }
      : { light: null, dark: null };
  function rgb(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  function hexColor(rgbValues) {
    return (
      '#' +
      rgbValues
        .map((c) =>
          Math.max(0, Math.min(255, Math.round(c)))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  }
  function mix(c1, c2, p) {
    const a = rgb(c1),
      b = rgb(c2);
    return hexColor(a.map((v, i) => v * (1 - p) + b[i] * p));
  }
  function luminance(hex) {
    const comps = rgb(hex).map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * comps[0] + 0.7152 * comps[1] + 0.0722 * comps[2];
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function themeColors() {
    return app.customColors[theme] || colorDefaults[theme];
  }
  function applyColors() {
    const r = document.documentElement,
      c = app.customColors[theme];
    const keys = [
      '--bg',
      '--paper',
      '--ink',
      '--sub',
      '--line',
      '--purple',
      '--purple2',
      '--soft',
      '--field',
      '--muted-panel',
      '--pill',
      '--pill-text',
      '--soft-text',
      '--shadow',
      '--button-ink',
    ];
    if (!c) {
      keys.forEach((k) => r.style.removeProperty(k));
      r.dataset.customColors = 'false';
      document.querySelector('meta[name="theme-color"]').content =
        theme === 'dark' ? '#191522' : '#f5f0fc';
      return;
    }
    const dark = theme === 'dark',
      base = dark ? '#14121b' : '#ffffff',
      label =
        contrast(c.text, c.background) >= 4.5
          ? c.text
          : luminance(c.background) > 0.36
            ? '#24202c'
            : '#f8f3ff';
    const set = {
      '--bg': c.background,
      '--paper': c.card,
      '--ink': label,
      '--sub': mix(label, c.background, 0.38),
      '--line': mix(c.card, label, dark ? 0.24 : 0.13),
      '--purple': c.accent,
      '--purple2': mix(c.accent, c.card, 0.3),
      '--soft': mix(c.accent, c.background, dark ? 0.75 : 0.85),
      '--field': mix(c.card, c.background, 0.28),
      '--muted-panel': mix(c.card, c.background, 0.48),
      '--pill': mix(c.card, c.background, 0.58),
      '--pill-text': label,
      '--soft-text': c.accent,
      '--shadow': dark ? 'rgba(0,0,0,.18)' : 'rgba(45,34,62,.06)',
      '--button-ink':
        contrast(c.accent, '#ffffff') >= 4.5
          ? '#ffffff'
          : contrast(c.accent, '#17121d') >= 4.5
            ? '#17121d'
            : luminance(c.accent) > 0.4
              ? '#17121d'
              : '#ffffff',
    };
    Object.entries(set).forEach(([k, v]) => r.style.setProperty(k, v));
    r.dataset.customColors = 'true';
    document.querySelector('meta[name="theme-color"]').content = c.background;
  }
  // Uma escolha de paleta vale sempre para os dois modos.
  function counterpartColors(color, sourceMode) {
    const accent = color.accent;
    if (sourceMode === 'light')
      return {
        accent: mix(accent, '#ffffff', 0.4),
        background: mix(accent, '#11131b', 0.9),
        card: mix(accent, '#24212d', 0.83),
        text: '#f7f4fc',
      };
    return {
      accent: mix(accent, '#17121d', 0.27),
      background: mix(accent, '#ffffff', 0.94),
      card: '#ffffff',
      text: mix(accent, '#24202a', 0.89),
    };
  }
  function pairedColors(color, sourceMode) {
    const matching = Object.values(palettes).find(
      (p) => p[sourceMode] && JSON.stringify(p[sourceMode]) === JSON.stringify(color),
    );
    return matching
      ? { ...matching[sourceMode === 'light' ? 'dark' : 'light'] }
      : counterpartColors(color, sourceMode);
  }
  function syncOtherTheme() {
    const other = theme === 'light' ? 'dark' : 'light';
    const colors = app.customColors[theme];
    app.customColors[other] = colors ? pairedColors(colors, theme) : null;
  }
  // Migração: ao abrir dados da v1.5 que tinham apenas uma versão customizada,
  // criar a versão correspondente, sem tocar nos treinos ou no histórico.
  if (app.customColors.light && !app.customColors.dark)
    app.customColors.dark = pairedColors(app.customColors.light, 'light');
  else if (app.customColors.dark && !app.customColors.light)
    app.customColors.light = pairedColors(app.customColors.dark, 'dark');
  function paletteSelected(name) {
    const p = palettes[name];
    if (!p) return;
    app.customColors.light = p.light ? { ...p.light } : null;
    app.customColors.dark = p.dark ? { ...p.dark } : null;
    applyColors();
    renderAppearance();
    renderChart();
    save();
    toast(
      name === 'lavanda' ? 'Lavanda restaurada nos dois modos.' : 'Paleta aplicada nos dois modos.',
    );
  }
  function renderAppearance() {
    const c = themeColors();
    for (const [name, key] of [
      ['colorAccent', 'accent'],
      ['colorBackground', 'background'],
      ['colorCard', 'card'],
      ['colorText', 'text'],
    ])
      $(name).value = c[key];
    const choiceBox = $('palettePicks');
    choiceBox.replaceChildren();
    for (const [key, p] of Object.entries(palettes)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-choice';
      const selected =
        key === 'lavanda'
          ? !app.customColors[theme]
          : !!app.customColors[theme] &&
            JSON.stringify(p[theme]) === JSON.stringify(app.customColors[theme]);
      btn.setAttribute('aria-pressed', String(selected));
      const dot = document.createElement('span');
      dot.className = 'palette-dot';
      dot.style.background = p.dot;
      dot.setAttribute('aria-hidden', 'true');
      btn.append(dot, document.createTextNode(p.label));
      btn.addEventListener('click', () => paletteSelected(key));
      choiceBox.append(btn);
    }
    $('appearanceStatus').textContent =
      (app.customColors[theme] ? 'Personalização ativa' : 'Lavanda original ativa') +
      ' · Modo ' +
      (theme === 'dark' ? 'escuro' : 'claro') +
      '.';
  }
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    $('themeToggle').textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    applyColors();
    renderAppearance();
  }

  function isSelectable(date) {
    const d = weekdayOf(date);
    return app.activeDays.includes(d) || !!app.sessions[date];
  }
  function selectDate(date) {
    if (transitioning) return;
    if (!isSelectable(date)) {
      toast('Esta data não possui treino programado ou histórico.');
      return;
    }
    const d = weekdayOf(date);
    day = d;
    sessionDate = date;
    $('sessionDate').value = date;
    renderDays();
    render();
    renderCalendar();
    renderConfig();
    renderChart();
  }
  function selectDay(d) {
    if (transitioning) return;
    const monday = parseDate(sessionDate);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + dayOffsets[d]);
    selectDate(iso(monday));
  }
  function renderDays() {
    const nav = $('daySwitch');
    nav.replaceChildren();
    for (const d of app.activeDays) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.day = d;
      btn.className = d === day ? 'active' : '';
      btn.setAttribute('aria-pressed', String(d === day));
      const name = document.createElement('span');
      name.textContent = weekNames[d];
      const sub = document.createElement('small');
      sub.textContent = app.dayTitles[d];
      btn.append(name, sub);
      btn.addEventListener('click', () => selectDay(d));
      nav.append(btn);
    }
    $('daySummary').textContent =
      app.activeDays.length +
      ' ' +
      (app.activeDays.length === 1 ? 'dia programado' : 'dias programados') +
      ' nesta semana';
  }
  function renderDayOptions() {
    const list = $('dayOptions');
    list.replaceChildren();
    for (const d of app.activeDays) {
      const item = document.createElement('div');
      item.className = 'day-option';
      const txt = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = weekNames[d] + ' · ' + app.dayTitles[d];
      const sub = document.createElement('small');
      sub.textContent = (app.templates[d] || []).length + ' exercícios';
      txt.append(title, sub);
      const actions = document.createElement('div');
      actions.className = 'day-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => openDayEditor(d));
      const duplicate = document.createElement('button');
      duplicate.type = 'button';
      duplicate.textContent = 'Duplicar';
      duplicate.addEventListener('click', () => openDayEditor(null, d));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'danger-soft';
      del.textContent = 'Excluir';
      del.disabled = app.activeDays.length === 1;
      del.addEventListener('click', () => deleteDay(d));
      actions.append(edit, duplicate, del);
      item.append(txt, actions);
      list.append(item);
    }
  }
  function closeDayEditor() {
    const el = $('dayDialog');
    if (typeof el.close === 'function') el.close();
    else el.removeAttribute('open');
  }
  function openDayEditor(d = null, copyFrom = null) {
    if (transitioning) return;
    editingDay = d;
    const available = allDays.filter((x) => !app.activeDays.includes(x));
    if (!d && !available.length) {
      toast('Os sete dias já estão programados.');
      return;
    }
    const selector = $('dayWeekday');
    selector.replaceChildren();
    for (const key of d ? [d] : available) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = weekNames[key];
      selector.append(o);
    }
    $('weekdayField').hidden = !!d;
    $('dayHeading').textContent = d
      ? 'Editar ' + weekNames[d]
      : copyFrom
        ? 'Duplicar treino'
        : 'Adicionar dia';
    $('dayDialogHint').textContent = d
      ? 'Altere o nome deste treino. Os registros anteriores serão preservados.'
      : 'Escolha um dia disponível e, se desejar, copie os exercícios de outro dia.';
    $('dayTitle').value = d ? app.dayTitles[d] : copyFrom ? app.dayTitles[copyFrom] : 'Treino';
    $('copyField').hidden = !!d;
    const source = $('dayCopy');
    source.replaceChildren();
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Começar sem exercícios';
    source.append(none);
    for (const key of app.activeDays) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = weekNames[key] + ' · ' + app.dayTitles[key];
      source.append(o);
    }
    source.value = copyFrom || '';
    const el = $('dayDialog');
    if (typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
    $('dayTitle').focus();
  }
  function saveDay(e) {
    e.preventDefault();
    const name = $('dayTitle').value.trim();
    if (!name) {
      toast('Informe o nome do treino.');
      return;
    }
    if (editingDay) {
      app.dayTitles[editingDay] = name;
      if (
        app.sessions[sessionDate] &&
        day === editingDay &&
        !recordedSession(app.sessions[sessionDate])
      )
        app.sessions[sessionDate].workoutName = name;
      toast('Nome atualizado.');
    } else {
      const d = $('dayWeekday').value;
      if (!allDays.includes(d) || app.activeDays.includes(d)) {
        toast('Escolha um dia disponível.');
        return;
      }
      const source = $('dayCopy').value;
      app.activeDays.push(d);
      app.activeDays.sort((a, b) => dayOffsets[a] - dayOffsets[b]);
      app.dayTitles[d] = name;
      app.templates[d] = source
        ? (app.templates[source] || []).map((ex, i) => ({
            ...ex,
            id: d + '-' + Date.now().toString(36) + '-' + i,
          }))
        : [];
      toast('Dia adicionado.');
      closeDayEditor();
      save();
      selectDay(d);
      renderDayOptions();
      renderChart();
      renderCalendar();
      return;
    }
    closeDayEditor();
    save();
    renderDays();
    renderDayOptions();
    render();
    renderChart();
    renderCalendar();
  }
  function deleteDay(d) {
    if (app.activeDays.length <= 1) {
      toast('Mantenha pelo menos um dia na programação.');
      return;
    }
    if (
      !confirm(
        'Remover ' +
          weekNames[d] +
          ' da programação? Os treinos de datas anteriores continuarão disponíveis no calendário e nos gráficos.',
      )
    )
      return;
    app.activeDays = app.activeDays.filter((x) => x !== d);
    if (day === d) {
      const other = app.activeDays[0];
      const monday = parseDate(sessionDate);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + dayOffsets[other]);
      day = other;
      sessionDate = iso(monday);
    }
    if (chartDay === d) chartDay = app.activeDays[0];
    save();
    renderDays();
    renderDayOptions();
    render();
    renderCalendar();
    renderConfig();
    renderChart();
    toast('Dia removido; histórico preservado.');
  }
  function dissolveCard(card, onFinish) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFinish();
      return;
    }
    transitioning = true;
    const rect = card.getBoundingClientRect(),
      duration = 760;
    const canvas = document.createElement('canvas');
    canvas.className = 'dust-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      transitioning = false;
      onFinish();
      return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    resize();
    const count = Math.min(310, Math.max(150, Math.floor((rect.width * rect.height) / 460)));
    const st = getComputedStyle(document.documentElement);
    const tones = ['--paper', '--bg', '--soft', '--purple2', '--purple', '--line', '--sub', '--ink']
      .map((k) => st.getPropertyValue(k).trim())
      .filter(Boolean);
    const parts = Array.from({ length: count }, () => {
      const rx = Math.random(),
        ry = Math.random();
      return {
        x: rect.left + rx * rect.width,
        y: rect.top + ry * rect.height,
        rx,
        delay: rx * 0.42 + Math.random() * 0.12,
        dx: (Math.random() * 0.8 + 0.15) * 90,
        dy: (Math.random() - 0.72) * 95,
        size: Math.random() * 3.5 + 1,
        spin: Math.random() * 6.28,
        color: tones[Math.floor(Math.random() * tones.length)],
      };
    });
    card.classList.add('dissolving');
    let start = null;
    function frame(timestamp) {
      if (start === null) start = timestamp;
      const t = Math.min((timestamp - start) / duration, 1);
      // O recorte abre progressivamente, como se a superfície se transformasse em pó.
      const amount = Math.min(1, t * 1.24);
      card.style.clipPath = `inset(0 0 0 ${amount * 100}%)`;
      card.style.opacity = String(Math.max(0, 1 - Math.max(0, t - 0.72) / 0.28));
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const part of parts) {
        const age = (t - part.delay) / (0.8 - part.delay);
        if (age <= 0 || age >= 1) continue;
        // Soltar somente fragmentos da área que já está desaparecendo.
        if (part.rx > amount + 0.12) continue;
        const ease = 1 - Math.pow(1 - age, 2),
          alpha = Math.pow(1 - age, 1.6) * 0.93;
        const x = part.x + part.dx * ease + Math.sin(age * 7 + part.spin) * 8 * age;
        const y = part.y + part.dy * ease;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = part.color;
        const size = part.size * (1 - age * 0.58);
        ctx.fillRect(x, y, size, size * 0.7);
      }
      ctx.globalAlpha = 1;
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
        transitioning = false;
        onFinish();
      }
    }
    requestAnimationFrame(frame);
  }

  function render() {
    const session = current(),
      list = $('list'),
      doneList = $('doneList');
    list.replaceChildren();
    doneList.replaceChildren();
    const total = totalSets(session),
      completed = countDone(session);
    let pending = 0,
      finished = 0;
    $('workoutTitle').textContent = current().workoutName || app.dayTitles[day] || 'Treino';
    // Aviso do leg press sem anilhas: só no nível Iniciante, nos dias que têm leg press.
    $('legNote').hidden = !(
      app.level.id === 'iniciante' && session.exercises.some((x) => /leg press/i.test(x.name))
    );
    $('sessionDate').value = sessionDate;
    $('workoutIntro').textContent =
      `${PROGRAMS[app.level.id]?.name || "Treino"} · ${session.exercises.length} exercícios · ${total} séries`;
    for (const ex of session.exercises) {
      const status = stage(ex);
      if (status === 'done') finished++;
      else pending++;
      const article = document.createElement('article');
      article.className = 'panel exercise';
      const top = document.createElement('div');
      top.className = 'cardtop';
      const titleWrap = document.createElement('div');
      const h = document.createElement('h3');
      h.textContent = ex.name;
      const detail = document.createElement('div');
      detail.className = 'details';
      detail.textContent = `${ex.sets.length} ${ex.sets.length === 1 ? 'série' : 'séries'} · ${ex.repsTarget} repetições`;
      titleWrap.append(h, detail);
      const badge = document.createElement('span');
      badge.className = 'status ' + (status === 'todo' ? '' : status);
      badge.textContent = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluído' }[status];
      top.append(titleWrap, badge);
      article.append(top);
      const cardline = document.createElement('div');
      cardline.className = 'card-editline';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'edit-card';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => openEditor(ex.id));
      const rest = document.createElement('button');
      rest.type = 'button';
      rest.className = 'edit-card';
      rest.textContent = `Descansar ${ex.rest} s`;
      rest.title = 'Iniciar cronômetro com o intervalo deste exercício';
      rest.addEventListener('click', () => {
        start(ex.rest);
        toast('Descanso de ' + ex.rest + ' segundos iniciado.');
      });
      cardline.append(edit, rest);
      article.append(cardline);
      const bottom = document.createElement('div');
      bottom.className = 'exercise-bottom';
      const setInputs = document.createElement('div');
      setInputs.className = 'set-inputs';
      const sets = document.createElement('div');
      sets.className = 'sets';
      ex.sets.forEach((set, n) => {
        const field = document.createElement('div');
        field.className = 'set-input';
        const label = document.createElement('label');
        label.textContent = 'Série ' + (n + 1);
        field.append(label);
        const grid = document.createElement('div');
        grid.className = 'mini-grid';
        for (const [type, labelText, placeholder] of [
          ['load', 'Carga (kg)', '0'],
          ['reps', 'Repetições', ex.repsTarget],
        ]) {
          const col = document.createElement('div'),
            lbl = document.createElement('label'),
            inp = document.createElement('input');
          const id = `input-${day}-${ex.id}-${n}-${type}`;
          lbl.htmlFor = id;
          lbl.textContent = labelText;
          inp.id = id;
          inp.type = 'text';
          inp.inputMode = type === 'load' ? 'decimal' : 'numeric';
          inp.autocomplete = 'off';
          inp.placeholder = placeholder;
          inp.value = set[type] || '';
          inp.addEventListener('input', () => {
            set[type] = inp.value;
            commit();
          });
          col.append(lbl, inp);
          grid.append(col);
        }
        field.append(grid);
        setInputs.append(field);
        const lab = document.createElement('label');
        lab.className = 'series';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!set.done;
        checkbox.setAttribute('aria-label', `${ex.name}, série ${n + 1} concluída`);
        checkbox.addEventListener('change', () => {
          if (transitioning) {
            checkbox.checked = !checkbox.checked;
            return;
          }
          const before = stage(ex) === 'done';
          set.done = checkbox.checked;
          commit();
          if (!before && stage(ex) === 'done') dissolveCard(article, () => render());
          else render();
        });
        lab.append(checkbox, document.createTextNode('Série ' + (n + 1)));
        sets.append(lab);
      });
      bottom.append(setInputs, sets);
      article.append(bottom);
      (status === 'done' ? doneList : list).append(article);
    }
    const empty = (box, text) => {
      const p = document.createElement('div');
      p.className = 'empty';
      p.textContent = text;
      box.append(p);
    };
    if (!pending)
      empty(
        list,
        session.exercises.length
          ? 'Todos os exercícios foram concluídos.'
          : 'Adicione seu primeiro exercício para começar.',
      );
    if (!finished) empty(doneList, 'Nenhum exercício concluído ainda.');
    $('pendingCount').textContent = pending;
    $('doneCount').textContent = finished;
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    $('pendingToggle').setAttribute(
      'aria-label',
      `Exercícios, ${plural(pending, 'pendente', 'pendentes')}`,
    );
    $('doneToggle').setAttribute(
      'aria-label',
      `Concluídos, ${plural(finished, 'exercício', 'exercícios')}`,
    );
    $('progressText').textContent = `${completed} de ${total} séries concluídas`;
    $('progressPct').textContent = (total ? Math.round((completed / total) * 100) : 0) + '%';
    $('fill').style.width = (total ? (completed / total) * 100 : 0) + '%';
    $('progressBar').setAttribute('aria-valuemax', total);
    $('progressBar').setAttribute('aria-valuenow', completed);
    renderDays();
    renderFeedback();
    renderLevel();
  }
  function renderConfig() {
    const box = $('exerciseOptions');
    box.replaceChildren();
    const session = current();
    $('customDayName').textContent =
      weekNames[day] + ' · ' + (session.workoutName || app.dayTitles[day] || 'Treino');
    session.exercises.forEach((ex) => {
      const row = document.createElement('div');
      row.className = 'exercise-config';
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = ex.name;
      const detail = document.createElement('small');
      detail.textContent = `${ex.sets.length} séries · ${ex.repsTarget} rep. · ${ex.rest} s`;
      info.append(name, detail);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Editar';
      btn.addEventListener('click', () => openEditor(ex.id));
      row.append(info, btn);
      box.append(row);
    });
    $('restOne').value = app.restQuick[0];
    $('restTwo').value = app.restQuick[1];
    $('t60').textContent = app.restQuick[0] + ' s';
    $('t90').textContent = app.restQuick[1] + ' s';
  }
  function openEditor(id = null) {
    if (transitioning) return;
    editingId = id;
    const ex = id ? current().exercises.find((x) => x.id === id) : null;
    if (id && !ex) return;
    $('editHeading').textContent = ex ? 'Editar exercício' : 'Novo exercício';
    $('editName').value = ex?.name || '';
    $('editSets').value = ex?.sets.length || 2;
    $('editReps').value = ex?.repsTarget || '12–15';
    $('editRest').value = ex?.rest || 75;
    $('deleteExercise').hidden = !ex;
    const dialog = $('exerciseDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    $('editName').focus();
  }
  function closeEditor() {
    const dialog = $('exerciseDialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  function saveEditor(e) {
    e.preventDefault();
    const name = $('editName').value.trim(),
      reps = $('editReps').value.trim(),
      count = Number($('editSets').value),
      rest = Number($('editRest').value);
    if (
      !name ||
      !reps ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 12 ||
      !Number.isInteger(rest) ||
      rest < 15 ||
      rest > 600
    ) {
      toast('Confira os campos do exercício.');
      return;
    }
    const sess = current();
    if (editingId) {
      const ex = sess.exercises.find((x) => x.id === editingId);
      if (!ex) return;
      ex.name = name;
      ex.repsTarget = reps;
      ex.rest = rest;
      ex.sets = Array.from({ length: count }, (_, i) => ex.sets[i] || emptySet());
      ex.count = count;
      const conf = app.templates[day].find((x) => x.id === editingId);
      if (conf) Object.assign(conf, { name, reps, rest, count });
      else app.templates[day].push({ id: editingId, name, reps, rest, count });
    } else {
      const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const conf = { id, name, reps, count, rest };
      app.templates[day].push(conf);
      sess.exercises.push(fromConfig(conf));
    }
    closeEditor();
    commit();
    render();
    renderConfig();
    toast(editingId ? 'Exercício atualizado.' : 'Exercício adicionado.');
  }
  function deleteEditor() {
    if (!editingId) return;
    const ex = current().exercises.find((x) => x.id === editingId);
    if (!ex) return;
    if (
      !confirm(
        `Excluir "${ex.name}" desta sessão e dos próximos treinos deste dia? Registros de outras datas serão mantidos.`,
      )
    )
      return;
    current().exercises = current().exercises.filter((x) => x.id !== editingId);
    app.templates[day] = app.templates[day].filter((x) => x.id !== editingId);
    closeEditor();
    commit();
    render();
    renderConfig();
    toast('Exercício excluído deste treino.');
  }
  function renderCalendar() {
    const grid = $('calendarGrid');
    grid.replaceChildren();
    const y = calendarMonth.getFullYear(),
      m = calendarMonth.getMonth();
    {
      const mt = new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      $('monthTitle').textContent = mt.charAt(0).toUpperCase() + mt.slice(1);
    }
    const daysInMonth = new Date(y, m + 1, 0).getDate(),
      offset = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.className = 'cal-cell empty-day';
      grid.append(blank);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = iso(new Date(y, m, i, 12)),
        d = weekdayOf(date),
        s = app.sessions[date],
        complete = s && totalSets(s) > 0 && countDone(s) === totalSets(s);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-cell';
      btn.textContent = String(i);
      btn.disabled = !(app.activeDays.includes(d) || !!s);
      if (app.activeDays.includes(d)) btn.classList.add('planned');
      if (s && recordedSession(s)) btn.classList.add('partial');
      if (complete) btn.classList.add('completed');
      if (date === sessionDate) btn.classList.add('selected');
      if (date === iso(new Date())) btn.classList.add('today');
      btn.title =
        date +
        ': ' +
        (weekNames[d] || '') +
        (s && !app.activeDays.includes(d) ? ' (histórico)' : '');
      btn.setAttribute(
        'aria-label',
        date +
          ', ' +
          weekNames[d] +
          (complete ? ', concluído' : s && recordedSession(s) ? ', iniciado' : ''),
      );
      if (!btn.disabled) btn.addEventListener('click', () => selectDate(date));
      grid.append(btn);
    }
  }
  // Feedback pós-treino: aparece quando todas as séries da sessão estão concluídas
  // (ou quando já existe um feedback salvo para a data).
  let feedbackSeen = { date: null, visible: false };
  function renderFeedback() {
    const session = current(),
      section = $('feedbackSection'),
      text = $('feedbackText');
    const value = String(session.feedback || '');
    const visible = sessionComplete(session) || !!value.trim();
    const justCompleted =
      visible && feedbackSeen.date === sessionDate && !feedbackSeen.visible && !value.trim();
    section.hidden = !visible;
    if (text.value !== value) text.value = value;
    $('feedbackCount').textContent = text.value.length + '/' + FEEDBACK_MAX;
    $('feedbackHint').textContent = value.trim() ? 'registrado' : 'opcional';
    $('feedbackStatus').textContent = value.trim()
      ? 'Salvo para ' + parseDate(sessionDate).toLocaleDateString('pt-BR') + '.'
      : 'Salvo automaticamente.';
    feedbackSeen = { date: sessionDate, visible };
    if (justCompleted) {
      $('feedbackToggle').setAttribute('aria-expanded', 'true');
      $('feedbackBody').hidden = false;
      toast('Treino concluído! Deixe seu feedback.');
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  // ---------- Níveis e progressão ----------
  // Critério para subir: treinos completos + aumento de carga desde o início do nível.
  function levelProgress() {
    const prog = PROGRAMS[app.level.id],
      next = prog?.next || null,
      since = app.level.since;
    const entries = Object.entries(app.sessions)
      .filter(([date]) => date >= since)
      .sort(([a], [b]) => a.localeCompare(b));
    const done = entries.filter(([, s]) => sessionComplete(s)).length;
    // Carga: maior carga numérica de cada exercício na primeira e na última sessão anotada.
    const loads = new Map();
    for (const [, s] of entries)
      for (const ex of s.exercises) {
        const vals = ex.sets.map((st) => numberLoad(st.load)).filter((v) => v !== null);
        if (!vals.length) continue;
        const max = Math.max(...vals),
          key = ex.name.trim().toLowerCase(),
          item = loads.get(key);
        if (item) item.last = max;
        else loads.set(key, { name: ex.name, first: max, last: max });
      }
    const increased = [...loads.values()].filter((x) => x.last > x.first);
    // Ritmo: treinos completos nas últimas 4 semanas; sem histórico, os dias programados.
    const from = new Date();
    from.setDate(from.getDate() - 27);
    const fromIso = iso(from),
      today = iso(new Date());
    const recent = Object.entries(app.sessions).filter(
      ([date, s]) => date >= fromIso && date <= today && sessionComplete(s),
    ).length;
    const perWeek = recent ? recent / 4 : app.activeDays.length;
    const missingWorkouts = next ? Math.max(0, next.workouts - done) : 0,
      missingLoads = next ? Math.max(0, next.loadIncreases - increased.length) : 0;
    return {
      prog,
      next,
      nextProg: next ? PROGRAMS[next.level] : null,
      done,
      increased,
      perWeek,
      measured: !!recent,
      missingWorkouts,
      missingLoads,
      weeks: missingWorkouts ? Math.ceil(missingWorkouts / perWeek) : 0,
      ready: !!next && !missingWorkouts && !missingLoads,
    };
  }
  function weeksText(w) {
    if (w <= 1) return '≈ 1 semana';
    if (w < 9) return `≈ ${w} semanas`;
    return `≈ ${Math.round(w / 4.35)} meses`;
  }
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  function meter(label, value, target) {
    const row = el('div', 'level-meter');
    const top = el('div', 'level-meter-top');
    top.append(el('span', '', label), el('b', '', `${Math.min(value, target)} de ${target}`));
    const track = el('div', 'track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(target));
    track.setAttribute('aria-valuenow', String(Math.min(value, target)));
    const bar = el('div', 'bar');
    bar.style.width = Math.min(100, (value / target) * 100) + '%';
    track.append(bar);
    row.append(top, track);
    return row;
  }
  function openProgramSettings() {
    $('settingsButton').click();
    if ($('programToggle').getAttribute('aria-expanded') !== 'true') $('programToggle').click();
    $('programSection').scrollIntoView({ block: 'start' });
  }
  function renderLevel() {
    const lp = levelProgress();
    const body = $('levelBody');
    body.replaceChildren();
    const since = parseDate(app.level.since).toLocaleDateString('pt-BR');
    const line = el('p', 'level-line');
    line.append('Nível atual: ', el('b', '', lp.prog.name), ` · desde ${since}`);
    body.append(line);
    if (!lp.next) {
      $('levelHint').textContent = lp.prog.name;
      body.append(
        el(
          'p',
          'level-estimate',
          'Você está no nível mais alto. Mantenha a constância e aumente a carga aos poucos, sempre sem dor.',
        ),
      );
      return renderProgramOptions(lp);
    }
    body.append(
      meter('Treinos completos', lp.done, lp.next.workouts),
      meter('Exercícios com carga aumentada', lp.increased.length, lp.next.loadIncreases),
    );
    const est = el('div', 'level-estimate');
    if (lp.ready) {
      $('levelHint').textContent = 'pronto para subir';
      est.classList.add('level-ready');
      est.append(el('p', '', `Você cumpriu os critérios do nível ${lp.nextProg.name}!`));
      const btn = el('button', 'manage-btn primary', `Ver programa ${lp.nextProg.name}`);
      btn.type = 'button';
      btn.addEventListener('click', openProgramSettings);
      est.append(btn);
    } else if (lp.missingWorkouts) {
      $('levelHint').textContent = `${lp.nextProg.name} em ${weeksText(lp.weeks)}`;
      const p1 = el('p');
      p1.append(`Tempo estimado até o nível ${lp.nextProg.name}: `, el('b', '', weeksText(lp.weeks)));
      const rate = lp.perWeek.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      const p2 = el(
        'p',
        'small',
        lp.measured
          ? `No seu ritmo de ${rate} ${lp.perWeek === 1 ? 'treino completo' : 'treinos completos'} por semana (últimas 4 semanas).`
          : `Considerando os ${app.activeDays.length} dias programados por semana.`,
      );
      est.append(p1, p2);
      if (lp.missingLoads)
        est.append(
          el(
            'p',
            'small',
            `Também falta aumentar a carga em ${lp.missingLoads} ${lp.missingLoads === 1 ? 'exercício' : 'exercícios'}.`,
          ),
        );
    } else {
      $('levelHint').textContent = 'falta aumentar carga';
      est.append(
        el(
          'p',
          '',
          `Falta aumentar a carga em ${lp.missingLoads} ${lp.missingLoads === 1 ? 'exercício' : 'exercícios'} para chegar ao nível ${lp.nextProg.name}.`,
        ),
        el(
          'p',
          'small',
          'Anote as cargas e aumente um pouco quando completar as repetições com folga e sem dor.',
        ),
      );
    }
    body.append(
      est,
      el(
        'p',
        'meta-line',
        `Critérios para ${lp.nextProg.name}: ${lp.next.workouts} treinos completos e carga maior em ${lp.next.loadIncreases} exercícios desde o início do nível.`,
      ),
    );
    renderProgramOptions(lp);
  }
  function renderProgramOptions(lp) {
    const box = $('programOptions');
    box.replaceChildren();
    for (const id of LEVELS) {
      const prog = PROGRAMS[id];
      if (!prog) continue;
      const current = id === app.level.id;
      const card = el('div', 'program-card' + (current ? ' current' : ''));
      const head = el('div', 'program-head');
      head.append(el('strong', '', prog.name));
      if (current) head.append(el('span', 'status', 'Atual'));
      else if (lp.ready && lp.next?.level === id) head.append(el('span', 'status done', 'Recomendado'));
      const days = Object.entries(prog.days)
        .map(([d, v]) => weekNames[d].slice(0, 3) + ' · ' + v.title)
        .join(', ');
      const btn = el('button', current ? '' : 'primary', current ? 'Restaurar programa' : 'Aplicar programa');
      btn.type = 'button';
      btn.addEventListener('click', () => applyProgram(id));
      card.append(
        head,
        el('div', 'small', prog.summary),
        el('p', 'program-focus', prog.focus),
        el('div', 'program-days', days),
        btn,
      );
      box.append(card);
    }
  }
  function applyProgram(id) {
    const prog = PROGRAMS[id];
    if (!prog || transitioning) return;
    const same = id === app.level.id;
    const ok = confirm(
      same
        ? `Restaurar o programa ${prog.name}? Os dias e exercícios programados voltam ao original deste nível. Seus registros anteriores ficam guardados.`
        : `Mudar para o nível ${prog.name}? Os dias e exercícios programados serão trocados pelo programa ${prog.name} a partir de hoje. Seus registros anteriores ficam guardados.`,
    );
    if (!ok) return;
    const days = Object.keys(prog.days).sort((a, b) => dayOffsets[a] - dayOffsets[b]);
    for (const d of allDays) app.templates[d] = programTemplate(id, d);
    app.activeDays = days;
    for (const d of days) app.dayTitles[d] = prog.days[d].title;
    if (!same) app.level = { id, since: iso(new Date()) };
    // Sessões de hoje em diante ainda sem registro são recriadas com o programa novo.
    const today = iso(new Date());
    for (const [date, s] of Object.entries(app.sessions))
      if (date >= today && !recordedSession(s)) delete app.sessions[date];
    sessionDate = openingDate();
    day = weekdayOf(sessionDate);
    chartDay = app.activeDays[0];
    chartEx = '';
    save();
    renderDays();
    render();
    renderDayOptions();
    renderConfig();
    renderCalendar();
    renderChart();
    toast(same ? 'Programa restaurado.' : `Nível ${prog.name} aplicado.`);
  }
  function numberLoad(value) {
    const raw = String(value || '')
      .replace(',', '.')
      .trim();
    if (!/^\d+(?:\.\d+)?(?:\s*kg)?$/i.test(raw)) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }
  function renderChart() {
    const sd = $('chartDay');
    const available = [
      ...new Set([
        ...app.activeDays,
        ...Object.values(app.sessions)
          .map((s) => s.day)
          .filter((d) => allDays.includes(d)),
      ]),
    ].sort((a, b) => dayOffsets[a] - dayOffsets[b]);
    if (!available.includes(chartDay)) chartDay = available[0] || app.activeDays[0];
    sd.replaceChildren();
    for (const d of available) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent =
        weekNames[d] +
        ' · ' +
        app.dayTitles[d] +
        (!app.activeDays.includes(d) ? ' (histórico)' : '');
      sd.append(opt);
    }
    sd.value = chartDay;
    const sel = $('chartExercise');
    const choices = new Map();
    for (const e of app.templates[chartDay] || []) choices.set(e.id, e.name);
    for (const record of Object.values(app.sessions))
      if (record.day === chartDay)
        for (const e of record.exercises)
          if (!choices.has(e.id)) choices.set(e.id, e.name + ' (histórico)');
    const entries = [...choices];
    const chosen = entries.some(([id]) => id === chartEx) ? chartEx : entries[0]?.[0] || '';
    chartEx = chosen;
    sel.replaceChildren();
    for (const [id, name] of entries) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = name;
      sel.append(o);
    }
    sel.value = chartEx;
    const series = Object.keys(app.sessions)
      .sort()
      .flatMap((date) => {
        const sess = app.sessions[date];
        if (sess.day !== chartDay) return [];
        const x = sess.exercises.find((e) => e.id === chartEx);
        if (!x) return [];
        const vals = x.sets.map((a) => numberLoad(a.load)).filter((v) => v !== null);
        return vals.length ? [{ date, value: Math.max(...vals) }] : [];
      })
      .slice(-12);
    const frame = $('chartFrame');
    frame.replaceChildren();
    $('chartCaption').textContent = series.length
      ? `${series.length} ${series.length === 1 ? 'registro' : 'registros'} com carga numérica. Cargas não numéricas não entram no gráfico.`
      : 'Para visualizar a evolução, registre cargas numéricas nas séries.';
    if (!series.length) {
      const no = document.createElement('div');
      no.className = 'chart-empty';
      no.textContent = 'Ainda não há cargas numéricas registradas para este exercício.';
      frame.append(no);
      return;
    }
    const NS = 'http://www.w3.org/2000/svg',
      sv = (tag, attrs = {}) => {
        const e = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
        return e;
      };
    const w = 330,
      h = 173,
      margin = { left: 34, right: 15, top: 17, bottom: 36 };
    let max = Math.max(...series.map((x) => x.value), 1);
    max = Math.ceil(max * 1.15) || 1;
    const x = (i) =>
        margin.left +
        (series.length === 1
          ? (w - margin.left - margin.right) / 2
          : (i * (w - margin.left - margin.right)) / (series.length - 1)),
      y = (v) => h - margin.bottom - (v / max) * (h - margin.top - margin.bottom);
    const svg = sv('svg', {
      viewBox: `0 0 ${w} ${h}`,
      role: 'img',
      'aria-label': 'Evolução das cargas por data',
    });
    for (let i = 0; i < 4; i++) {
      const val = (max * i) / 3;
      svg.append(
        sv('line', {
          x1: margin.left,
          y1: y(val),
          x2: w - margin.right,
          y2: y(val),
          stroke: 'currentColor',
          'stroke-opacity': '.14',
          'stroke-dasharray': '3 4',
        }),
      );
      const t = sv('text', {
        x: margin.left - 7,
        y: y(val) + 4,
        'text-anchor': 'end',
        fill: 'currentColor',
        'fill-opacity': '.65',
        'font-size': 10,
      });
      t.textContent = val.toFixed(0);
      svg.append(t);
    }
    if (series.length > 1)
      svg.append(
        sv('polyline', {
          points: series.map((a, i) => `${x(i)},${y(a.value)}`).join(' '),
          stroke: 'var(--purple2)',
          'stroke-width': 3,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: 'none',
        }),
      );
    series.forEach((p, i) => {
      const dot = sv('circle', {
        cx: x(i),
        cy: y(p.value),
        r: 4.5,
        fill: 'var(--purple)',
        stroke: 'var(--paper)',
        'stroke-width': 1.5,
      });
      const title = sv('title');
      title.textContent = `${p.date}: ${p.value} kg`;
      dot.append(title);
      svg.append(dot);
      const t = sv('text', {
        x: x(i),
        y: h - 12,
        'text-anchor': 'middle',
        fill: 'currentColor',
        'font-size': series.length > 7 ? 8 : 10,
      });
      t.textContent = p.date.substring(8) + '/' + p.date.substring(5, 7);
      if (series.length <= 7 || i % 2 === 0) svg.append(t);
    });
    frame.append(svg);
  }
  for (const id of [
    'pending',
    'done',
    'days',
    'appearance',
    'custom',
    'rest',
    'calendar',
    'history',
    'feedback',
    'level',
    'program',
  ]) {
    $(id + 'Toggle').addEventListener('click', () => {
      const btn = $(id + 'Toggle'),
        body = $(id + 'Body'),
        expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
      if (!expanded) {
        if (id === 'calendar') renderCalendar();
        if (id === 'history') renderChart();
        if (id === 'custom' || id === 'rest') renderConfig();
        if (id === 'days') renderDayOptions();
        if (id === 'appearance') renderAppearance();
      }
    });
  }
  $('feedbackText').addEventListener('input', (e) => {
    const value = e.target.value.slice(0, FEEDBACK_MAX);
    current().feedback = value;
    save();
    $('feedbackCount').textContent = value.length + '/' + FEEDBACK_MAX;
    $('feedbackHint').textContent = value.trim() ? 'registrado' : 'opcional';
    $('feedbackStatus').textContent = 'Salvo automaticamente.';
  });
  // Registros antigos de sintomas: a análise só aparece se houver algum.
  $('analysisSection').hidden = !Object.values(app.sessions).some(hasSymptoms);
  for (const [id, key] of [
    ['colorAccent', 'accent'],
    ['colorBackground', 'background'],
    ['colorCard', 'card'],
    ['colorText', 'text'],
  ])
    $(id).addEventListener('input', (e) => {
      if (!validColor(e.target.value)) return;
      app.customColors[theme] = { ...themeColors(), [key]: e.target.value.toLowerCase() };
      syncOtherTheme();
      applyColors();
      renderAppearance();
      renderChart();
      save();
    });
  $('resetColors').addEventListener('click', () => paletteSelected('lavanda'));
  $('themeToggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    app.theme = theme;
    applyTheme();
    save();
  });
  $('sessionDate').addEventListener('change', (e) => {
    const v = e.target.value;
    if (!v || !isSelectable(v)) {
      toast('Escolha um dia programado ou com histórico.');
      e.target.value = sessionDate;
      return;
    }
    selectDate(v);
    calendarMonth = parseDate(v);
    renderCalendar();
  });
  $('prevMonth').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  });
  $('chartDay').addEventListener('change', (e) => {
    chartDay = e.target.value;
    chartEx = '';
    renderChart();
  });
  $('chartExercise').addEventListener('change', (e) => {
    chartEx = e.target.value;
    renderChart();
  });
  $('reset').addEventListener('click', () => {
    if (transitioning) return;
    if (confirm('Desmarcar as séries desta data? Cargas, repetições e sintomas serão mantidos.')) {
      current().exercises.forEach((ex) => ex.sets.forEach((s) => (s.done = false)));
      commit();
      render();
      toast('Séries reiniciadas.');
    }
  });
  // Resumo legível do treino da data selecionada, para enviar por mensagem.
  function shareText() {
    const sess = current(),
      total = totalSets(sess),
      completed = countDone(sess),
      date = parseDate(sessionDate).toLocaleDateString('pt-BR');
    const lines = [`🏋️ ${sess.workoutName || app.dayTitles[day]} — ${weekNames[day]}, ${date}`];
    lines.push(
      total && completed === total
        ? `✅ Treino completo · ${total} de ${total} séries`
        : `✅ ${completed} de ${total} séries (${total ? Math.round((completed / total) * 100) : 0}%)`,
    );
    lines.push('');
    const load = (v) => {
      const t = String(v || '').trim();
      return t && numberLoad(t) !== null && !/kg/i.test(t) ? t + ' kg' : t;
    };
    for (const ex of sess.exercises) {
      const done = ex.sets.filter((st) => st.done);
      if (!done.length) {
        lines.push(`${ex.name}: não feito`);
        continue;
      }
      // Séries com carga/repetições anotadas aparecem uma a uma; as demais são contadas.
      const noted = [];
      let bare = 0;
      for (const st of done) {
        const l = load(st.load),
          r = String(st.reps || '').trim();
        if (l || r) noted.push(l && r ? `${l} × ${r}` : l || r + ' reps');
        else bare++;
      }
      let detail = noted.join(' · ');
      if (bare)
        detail += noted.length
          ? ` + ${bare} sem anotação`
          : `${bare} ${bare === 1 ? 'série' : 'séries'}`;
      const partial = done.length < ex.sets.length ? ` (${done.length} de ${ex.sets.length} séries)` : '';
      lines.push(`${ex.name}: ${detail}${partial}`);
    }
    if (hasSymptoms(sess)) {
      const pairs = metrics
        .map(([key, name]) => {
          const a = sess.symptoms.before?.[key],
            b = sess.symptoms.after?.[key];
          return a || b ? `${name} ${a || '—'} → ${b || '—'}` : '';
        })
        .filter(Boolean);
      if (pairs.length) lines.push('', '🩺 Sintomas (antes → depois): ' + pairs.join(', '));
    }
    const fb = String(sess.feedback || '').trim();
    if (fb) lines.push('', '💬 ' + fb);
    return lines.join('\n');
  }
  async function copyText(txt) {
    try {
      await navigator.clipboard.writeText(txt);
      return true;
    } catch (e) {
      const a = document.createElement('textarea');
      a.value = txt;
      document.body.append(a);
      a.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      a.remove();
      return ok;
    }
  }
  // No celular abre o menu de compartilhamento do sistema (WhatsApp, e-mail...).
  // No computador, ou se o compartilhamento não existir, copia o texto.
  $('copy').addEventListener('click', async () => {
    const txt = shareText();
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: 'Meu treino — SIHAYA', text: txt });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // a pessoa fechou o menu
      }
    }
    toast((await copyText(txt)) ? 'Treino copiado. Cole onde quiser.' : 'Cópia bloqueada pelo navegador.');
  });
  function clock() {
    $('clock').textContent =
      String(Math.floor(remaining / 60)).padStart(2, '0') +
      ':' +
      String(remaining % 60).padStart(2, '0');
  }
  function pause() {
    clearInterval(timer);
    timer = null;
    $('pause').textContent = 'Retomar';
  }
  function start(seconds) {
    if (seconds !== undefined) remaining = seconds;
    clearInterval(timer);
    last = Date.now();
    timer = setInterval(() => {
      const now = Date.now(),
        elapsed = Math.floor((now - last) / 1000);
      if (elapsed < 1) return;
      last += elapsed * 1000;
      remaining = Math.max(0, remaining - elapsed);
      clock();
      if (remaining === 0) {
        pause();
        toast('Descanso concluído.');
        if (navigator.vibrate) navigator.vibrate(150);
      }
    }, 250);
    $('pause').textContent = 'Pausar';
    clock();
  }
  $('t60').onclick = () => start(app.restQuick[0]);
  $('t90').onclick = () => start(app.restQuick[1]);
  $('pause').onclick = () => (timer ? pause() : start());
  for (const [id, i] of [
    ['restOne', 0],
    ['restTwo', 1],
  ])
    $(id).addEventListener('change', (e) => {
      const n = Number(e.target.value);
      if (!Number.isInteger(n) || n < 15 || n > 600) {
        toast('Intervalo deve ser de 15 a 600 segundos.');
        e.target.value = app.restQuick[i];
        return;
      }
      app.restQuick[i] = n;
      save();
      renderConfig();
      toast('Intervalo atualizado.');
    });
  $('addDay').addEventListener('click', () => openDayEditor());
  $('dayForm').addEventListener('submit', saveDay);
  $('cancelDay').addEventListener('click', closeDayEditor);
  $('addExercise').addEventListener('click', () => openEditor());
  $('addExercisePanel').addEventListener('click', () => openEditor());
  $('exerciseForm').addEventListener('submit', saveEditor);
  $('cancelExercise').addEventListener('click', closeEditor);
  $('deleteExercise').addEventListener('click', deleteEditor);

  // ===== Versão 2.0: relatórios locais, comparações e backup portátil =====
  let reportMonth = iso(new Date()).slice(0, 7);
  function sessionHasActivity(s) {
    return !!(s && recordedSession(s));
  }
  function monthlyData(month) {
    const rows = Object.entries(app.sessions)
      .filter(([date, s]) => date.slice(0, 7) === month && sessionHasActivity(s))
      .sort(([a], [b]) => a.localeCompare(b));
    let doneSets = 0,
      allSets = 0,
      full = 0,
      withLoads = 0;
    const byDay = new Map(),
      weeks = new Map();
    const data = rows.map(([date, s]) => {
      const completed = countDone(s),
        total = totalSets(s),
        finished = total > 0 && completed === total;
      doneSets += completed;
      allSets += total;
      if (finished) full++;
      const loadCount = s.exercises
        .flatMap((e) => e.sets)
        .filter((st) => numberLoad(st.load) !== null).length;
      withLoads += loadCount;
      const name = weekNames[s.day] || s.day || 'Treino';
      const rec = byDay.get(name) || { sessions: 0, complete: 0, sets: 0 };
      rec.sessions++;
      rec.complete += finished ? 1 : 0;
      rec.sets += completed;
      byDay.set(name, rec);
      const year = +date.slice(0, 4),
        m = +date.slice(5, 7) - 1,
        dd = +date.slice(8);
      const week = Math.floor((dd + ((new Date(year, m, 1).getDay() + 6) % 7) - 1) / 7) + 1;
      weeks.set(week, (weeks.get(week) || 0) + 1);
      return {
        date,
        day: name,
        workout: s.workoutName || '',
        doneSets: completed,
        totalSets: total,
        finished,
        loads: loadCount,
        s,
      };
    });
    return {
      month,
      rows: data,
      sessions: rows.length,
      full,
      doneSets,
      allSets,
      withLoads,
      byDay,
      weeks,
    };
  }
  function pct(n, d) {
    return d ? Math.round((n / d) * 100) : 0;
  }
  function formatMonth(month) {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  function statTile(label, val) {
    const el = document.createElement('div');
    el.className = 'stat-tile';
    const b = document.createElement('b');
    b.textContent = String(val);
    const span = document.createElement('span');
    span.textContent = label;
    el.append(b, span);
    return el;
  }
  function plotBars(values, labels, description) {
    const host = document.createElement('div');
    if (!values.some((x) => x > 0)) {
      host.className = 'report-empty';
      host.textContent = 'Ainda não há dados suficientes neste período.';
      return host;
    }
    const ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 340 165');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', description);
    const max = Math.max(...values, 1),
      col = 270 / values.length;
    for (let i = 0; i < values.length; i++) {
      const h = (110 * values[i]) / max;
      const rect = document.createElementNS(ns, 'rect');
      for (const [k, v] of Object.entries({
        x: 42 + i * col + col * 0.18,
        y: 124 - h,
        width: col * 0.64,
        height: h,
        rx: 5,
        fill: 'var(--purple)',
      }))
        rect.setAttribute(k, v);
      svg.append(rect);
      for (const [txt, y, sz] of [
        [String(values[i]), Math.max(15, 117 - h), 11],
        [labels[i], 147, 10],
      ]) {
        const t = document.createElementNS(ns, 'text');
        for (const [k, v] of Object.entries({
          x: 42 + i * col + col * 0.5,
          y,
          'text-anchor': 'middle',
          fill: 'currentColor',
          'font-size': sz,
        }))
          t.setAttribute(k, v);
        t.textContent = txt;
        svg.append(t);
      }
    }
    host.append(svg);
    return host;
  }
  function renderReports() {
    const month = $('reportMonth');
    if (!month.value) month.value = reportMonth;
    else reportMonth = month.value;
    const d = monthlyData(reportMonth),
      stats = $('reportStats');
    stats.replaceChildren();
    [
      ['Sessões registradas', d.sessions],
      ['Treinos completos', d.full],
      ['Séries concluídas', d.doneSets],
      ['Conclusão das séries', pct(d.doneSets, d.allSets) + '%'],
    ].forEach(([label, value]) => stats.append(statTile(label, value)));
    const maxWeeks = Math.ceil(
      (new Date(+reportMonth.slice(0, 4), +reportMonth.slice(5), 0).getDate() +
        ((new Date(+reportMonth.slice(0, 4), +reportMonth.slice(5) - 1, 1).getDay() + 6) % 7)) /
        7,
    );
    const vals = Array.from({ length: maxWeeks }, (_, i) => d.weeks.get(i + 1) || 0);
    $('reportPlot').replaceChildren(
      plotBars(
        vals,
        vals.map((_, i) => 'S' + (i + 1)),
        'Sessões com registro por semana do mês',
      ),
    );
    const by = $('reportDays');
    by.replaceChildren();
    if (!d.byDay.size) {
      const p = document.createElement('p');
      p.className = 'report-empty';
      p.textContent = 'Nenhuma sessão com atividade registrada neste mês.';
      by.append(p);
    } else
      for (const [name, o] of d.byDay) {
        const line = document.createElement('div');
        line.className = 'month-row';
        const a = document.createElement('span');
        a.textContent = name;
        const b = document.createElement('b');
        b.textContent = `${o.sessions} sessão(ões) · ${o.sets} séries`;
        line.append(a, b);
        by.append(line);
      }
    $('reportFoot').textContent =
      `${d.withLoads} série(s) com carga numérica registrada. Os relatórios não estimam calorias, tonificação nem resultado clínico.`;
    renderComparison();
    renderSymptomAnalysis();
  }
  function allReportMonths() {
    const months = new Set([reportMonth, iso(new Date()).slice(0, 7)]);
    for (const [date, s] of Object.entries(app.sessions))
      if (sessionHasActivity(s)) months.add(date.slice(0, 7));
    const [y, m] = reportMonth.split('-').map(Number);
    months.add(iso(new Date(y, m - 2, 1)).slice(0, 7));
    return [...months].sort();
  }
  function renderComparison() {
    const months = allReportMonths(),
      from = $('compareFrom'),
      to = $('compareTo');
    const keepFrom = from.value,
      keepTo = to.value;
    from.replaceChildren();
    to.replaceChildren();
    for (const month of months) {
      for (const target of [from, to]) {
        const opt = document.createElement('option');
        opt.value = month;
        opt.textContent = formatMonth(month);
        target.append(opt);
      }
    }
    const [y, m] = reportMonth.split('-').map(Number),
      previous = iso(new Date(y, m - 2, 1)).slice(0, 7);
    from.value = months.includes(keepFrom) ? keepFrom : previous;
    to.value = months.includes(keepTo) ? keepTo : reportMonth;
    const a = monthlyData(from.value),
      b = monthlyData(to.value),
      holder = $('compareResults');
    holder.replaceChildren();
    for (const [title, v1, v2, suffix] of [
      ['Sessões registradas', a.sessions, b.sessions, ''],
      ['Treinos completos', a.full, b.full, ''],
      ['Séries concluídas', a.doneSets, b.doneSets, ''],
      ['Conclusão das séries', pct(a.doneSets, a.allSets), pct(b.doneSets, b.allSets), ' p.p.'],
    ]) {
      const line = document.createElement('div');
      line.className = 'compare-line';
      const h = document.createElement('strong');
      h.textContent = title;
      const values = document.createElement('div');
      values.className = 'compare-values';
      const first = document.createElement('b');
      first.textContent = String(v1) + (suffix ? '%' : '');
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      const second = document.createElement('b');
      second.textContent = String(v2) + (suffix ? '%' : '');
      const delta = document.createElement('span');
      delta.className = 'compare-delta';
      const difference = v2 - v1;
      delta.textContent = (difference > 0 ? '+' : '') + difference + (suffix || '');
      values.append(first, arrow, second, delta);
      line.append(h, values);
      holder.append(line);
    }
  }
  function metricAverage(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
  function renderSymptomAnalysis() {
    const d = monthlyData(reportMonth),
      area = $('symptomAnalytics');
    area.replaceChildren();
    const plotVals = [],
      plotLabels = [],
      counts = [];
    for (const [metric, label] of metrics) {
      const pair = d.rows.flatMap(({ s }) => {
        const a = s.symptoms?.before?.[metric],
          b = s.symptoms?.after?.[metric];
        if (a === '' || b === '' || a == null || b == null) return [];
        const x = Number(a),
          y = Number(b);
        return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 10 && y <= 10
          ? [{ before: x, after: y }]
          : [];
      });
      const changes = pair.map((x) => x.after - x.before),
        avg = metricAverage(changes);
      const box = document.createElement('div');
      box.className = 'symptom-analytic';
      const h = document.createElement('strong');
      h.textContent = label;
      const value = document.createElement('b');
      value.textContent =
        avg === null
          ? '—'
          : (avg > 0 ? '+' : '') +
            avg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const detail = document.createElement('span');
      detail.textContent = `Variação média após − antes · ${pair.length} par(es)`;
      box.append(h, value, detail);
      area.append(box);
      plotVals.push(avg === null ? 0 : Math.abs(avg));
      plotLabels.push(label.split(' ')[0]);
      counts.push(pair.length);
    }
    $('symptomPlot').replaceChildren(
      plotBars(
        plotVals,
        plotLabels,
        'Magnitude absoluta da variação média antes e depois do treino',
      ),
    );
    const pairedTotal = d.rows.filter(({ s }) =>
      metrics.some(([k]) => {
        const a = s.symptoms?.before?.[k],
          b = s.symptoms?.after?.[k];
        return a !== '' && b !== '' && a != null && b != null;
      }),
    ).length;
    $('symptomFoot').textContent = pairedTotal
      ? `Há ${pairedTotal} sessão(ões) com ao menos um par de sintomas preenchido. Valores positivos indicam intensidade maior depois do treino; negativos, menor. São variações observadas, sem demonstrar causa ou diagnóstico.`
      : 'Sem pares de sintomas antes/depois no mês selecionado. Preencha os dois momentos para obter comparações.';
  }
  function csvCell(v) {
    let s = String(v ?? '');
    if (/^[=+@\t\r-]/.test(s) && !/^[-+]?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function downloadText(name, content, type) {
    const blob = new Blob([content], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function exportReportCsv() {
    const d = monthlyData(reportMonth),
      lines = [
        [
          'Data',
          'Dia',
          'Treino',
          'Séries concluídas',
          'Total de séries',
          'Treino completo',
          'Séries com carga numérica',
        ],
      ];
    for (const s of d.rows)
      lines.push([
        s.date,
        s.day,
        s.workout,
        s.doneSets,
        s.totalSets,
        s.finished ? 'Sim' : 'Não',
        s.loads,
      ]);
    downloadText(
      'relatorio-treinos-' + reportMonth + '.csv',
      '\ufeff' + lines.map((row) => row.map(csvCell).join(';')).join('\r\n'),
      'text/csv;charset=utf-8',
    );
    toast('Relatório CSV exportado.');
  }
  function exportAllCsv() {
    const rows = [
      [
        'Data',
        'Treino',
        'Exercício',
        'Série',
        'Concluída',
        'Carga (kg)',
        'Repetições',
        'Dor antes',
        'Dor depois',
        'Inchaço antes',
        'Inchaço depois',
        'Peso antes',
        'Peso depois',
        'Cansaço antes',
        'Cansaço depois',
        'Feedback do treino',
      ],
    ];
    for (const [date, s] of Object.entries(app.sessions).sort(([a], [b]) => a.localeCompare(b))) {
      if (!sessionHasActivity(s)) continue;
      for (const ex of s.exercises)
        ex.sets.forEach((set, i) =>
          rows.push([
            date,
            s.workoutName || s.day,
            ex.name,
            i + 1,
            set.done ? 'Sim' : 'Não',
            set.load,
            set.reps,
            ...metrics.flatMap(([k]) => [
              s.symptoms?.before?.[k] ?? '',
              s.symptoms?.after?.[k] ?? '',
            ]),
            s.feedback || '',
          ]),
        );
    }
    downloadText(
      'historico-treinos.csv',
      '\ufeff' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n'),
      'text/csv;charset=utf-8',
    );
    toast('Histórico CSV exportado.');
  }
  function exportBackup() {
    const payload = {
      format: 'kanban-lavanda-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: app,
    };
    downloadText(
      'backup-kanban-' + iso(new Date()) + '.json',
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
    $('backupStatus').textContent =
      'Backup exportado. Guarde o arquivo em local seguro; não há envio automático à nuvem.';
    toast('Backup JSON criado.');
  }
  function validBackup(raw) {
    if (
      !raw ||
      raw.format !== 'kanban-lavanda-backup' ||
      raw.version !== 2 ||
      !raw.data ||
      typeof raw.data !== 'object' ||
      !raw.data.sessions ||
      typeof raw.data.sessions !== 'object' ||
      Array.isArray(raw.data.sessions) ||
      !raw.data.templates ||
      typeof raw.data.templates !== 'object' ||
      !Array.isArray(raw.data.activeDays) ||
      !raw.data.activeDays.every((d) => allDays.includes(d))
    )
      throw Error('Arquivo não é um backup válido deste aplicativo.');
    if (Object.keys(raw.data.sessions).length > 15000)
      throw Error('Arquivo contém registros demais.');
    for (const [date, s] of Object.entries(raw.data.sessions)) {
      if (
        !/^\d{4}-\d\d-\d\d$/.test(date) ||
        !s ||
        !Array.isArray(s.exercises) ||
        s.exercises.length > 200
      )
        throw Error('Sessões inválidas no backup.');
    }
    return raw.data;
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      if (file.size > 12 * 1024 * 1024) throw Error('O backup excede 12 MB.');
      const parsed = JSON.parse(await file.text()),
        data = validBackup(parsed);
      if (
        !confirm(
          `Restaurar o backup de ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString('pt-BR') : 'data desconhecida'}? Isso substituirá os dados atuais. Faça um backup antes de continuar.`,
        )
      )
        return;
      const previous = JSON.stringify(app);
      try {
        localStorage.setItem(newKey, JSON.stringify(data));
      } catch (e) {
        localStorage.setItem(newKey, previous);
        throw Error('Sem espaço para salvar. Nada foi importado.');
      }
      location.reload();
    } catch (e) {
      $('backupStatus').textContent =
        'Falha ao restaurar: ' +
        (e instanceof SyntaxError
          ? 'o arquivo não é um JSON válido ou está corrompido.'
          : e.message);
      toast('Não foi possível restaurar o backup.');
    } finally {
      $('importBackup').value = '';
    }
  }
  for (const id of ['reports', 'comparison', 'analysis', 'backup'])
    $(id + 'Toggle').addEventListener('click', () => {
      const b = $(id + 'Toggle'),
        body = $(id + 'Body'),
        open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      body.hidden = open;
      if (!open) {
        if (id === 'reports') renderReports();
        if (id === 'comparison') renderComparison();
        if (id === 'analysis') renderSymptomAnalysis();
      }
    });
  $('reportMonth').addEventListener('change', (e) => {
    if (!/^\d{4}-\d\d$/.test(e.target.value)) return;
    reportMonth = e.target.value;
    renderReports();
  });
  for (const id of ['compareFrom', 'compareTo']) $(id).addEventListener('change', renderComparison);
  $('reportCsv').addEventListener('click', exportReportCsv);
  $('exportSessionsCsv').addEventListener('click', exportAllCsv);
  $('exportBackup').addEventListener('click', exportBackup);
  $('importBackup').addEventListener('change', (e) => importBackup(e.target.files?.[0]));

  applyTheme();
  save();
  clock();
  renderDays();
  render();
  renderDayOptions();
  renderConfig();
  renderCalendar();
  renderChart();
})();

/* Tela de boas-vindas e registro do service worker. */
(function () {
  const welcome = document.getElementById('welcome');
  function openApp() {
    welcome.hidden = true;
    document.body.classList.remove('sihaya-welcome');
    try {
      sessionStorage.setItem('sihaya-welcome-seen', '1');
    } catch {}
  }
  function showHome() {
    welcome.hidden = false;
    document.body.classList.add('sihaya-welcome');
  }
  document.getElementById('enterApp').addEventListener('click', openApp);
  document.getElementById('homeButton').addEventListener('click', showHome);

  // Tela de Configurações gerais. Usa o histórico do navegador para que o
  // botão "voltar" do celular retorne ao treino em vez de sair do app.
  const main = document.querySelector('main');
  const settings = document.getElementById('settingsView');
  const settingsButton = document.getElementById('settingsButton');
  document.getElementById('appVersion').textContent = self.SIHAYA_VERSION || '—';
  function showSettings(open) {
    main.hidden = open;
    settings.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
    window.scrollTo(0, 0);
    (open ? document.getElementById('settingsTitle') : settingsButton).focus({
      preventScroll: true,
    });
  }
  settingsButton.addEventListener('click', () => {
    history.pushState({ sihayaSettings: true }, '', '#configuracoes');
    showSettings(true);
  });
  document.getElementById('settingsBack').addEventListener('click', () => {
    if (history.state?.sihayaSettings) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      showSettings(false);
    }
  });
  window.addEventListener('popstate', () => showSettings(location.hash === '#configuracoes'));
  if (location.hash === '#configuracoes') showSettings(true);
  try {
    if (sessionStorage.getItem('sihaya-welcome-seen') === '1') openApp();
  } catch {}
  if (
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1')
  )
    navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
