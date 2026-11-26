/* SIHAYA — companheiro Brolaith, água, refeições, perfil de saúde e lembretes.
   Usa os dados do app (SIHAYA_CORE) e as falas de js/brolaith.js.
   Os dados de saúde ficam só no aparelho e nos backups; o servidor de push
   recebe apenas os horários dos lembretes. */
(() => {
  'use strict';
  const C = self.SIHAYA_CORE;
  if (!C || !self.brolaithSay) return;
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const lastLines = {};
  const DEFAULT_MEALS = [
    ['Café da manhã', '07:30'],
    ['Lanche da manhã', '10:00'],
    ['Almoço', '12:30'],
    ['Lanche da tarde', '15:30'],
    ['Jantar', '19:00'],
    ['Ceia', '21:30'],
  ];
  const validTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '');
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };

  // ---------- Estado (guardado junto com os dados do app) ----------
  function normalize() {
    const a = C.data();
    const p = a.profile || {};
    a.profile = {
      heightCm: p.heightCm ?? '',
      weightKg: p.weightKg ?? '',
      weightDate: p.weightDate || '',
      surgery: p.surgery || '',
      surgeryDate: p.surgeryDate || '',
      notes: String(p.notes || ''),
    };
    const n = a.nutrition || {};
    a.nutrition = {
      waterGoalMl: n.waterGoalMl ? num(n.waterGoalMl, 500, 5000, '') : '',
      cupMl: num(n.cupMl, 50, 2000, 800),
      pauseMin: num(n.pauseMin, 0, 120, 30),
      diet: String(n.diet || ''),
      meals: Array.isArray(n.meals)
        ? n.meals
            .filter((m) => m && validTime(m.time))
            .map((m, i) => ({
              id: String(m.id || 'm' + i),
              name: String(m.name || 'Refeição'),
              time: m.time,
              plan: String(m.plan || ''),
            }))
        : DEFAULT_MEALS.map(([name, time], i) => ({ id: 'm' + i, name, time, plan: '' })),
    };
    a.hydration = a.hydration && typeof a.hydration === 'object' ? a.hydration : {};
    a.mealLog = a.mealLog && typeof a.mealLog === 'object' ? a.mealLog : {};
    const r = a.reminders || {};
    a.reminders = {
      enabled: !!r.enabled,
      water: {
        enabled: r.water?.enabled ?? true,
        every: num(r.water?.every, 15, 240, 60),
        start: validTime(r.water?.start) ? r.water.start : '08:00',
        end: validTime(r.water?.end) ? r.water.end : '21:00',
      },
      skipPause: r.skipPause ?? true,
      meals: { enabled: r.meals?.enabled ?? true, before: num(r.meals?.before, 0, 60, 0) },
      push: { url: String(r.push?.url || ''), key: String(r.push?.key || ''), connected: !!r.push?.connected },
      fired: r.fired && r.fired.date ? r.fired : { date: '', keys: [] },
    };
    const c = a.companion || {};
    a.companion = {
      enabled: c.enabled ?? true,
      treatment: self.BROLAITH.treatments.includes(c.treatment) ? c.treatment : 'pequena cavaleira',
      silence: !!c.silence,
      xp: { enabled: c.xp?.enabled ?? true, total: num(c.xp?.total, 0, 1e9, 0) },
      mood: c.mood && c.mood.date ? c.mood : { date: '', value: '' },
      sound: c.sound ?? true,
      lastSeen: c.lastSeen || '',
      levelNotice: c.levelNotice || '',
    };
  }
  normalize();
  const A = () => C.data();
  const CMP = () => A().companion;
  const NUT = () => A().nutrition;
  const REM = () => A().reminders;

  // ---------- Fala do Brolaith ----------
  function vars(extra = {}) {
    return { t: CMP().treatment, treino: C.workoutName(), ...extra };
  }
  function line(kind, extra) {
    return self.brolaithSay(kind, vars(extra), lastLines);
  }
  function speak(kind, extra, { force = false } = {}) {
    const c = CMP();
    if (!c.enabled || (c.silence && !force)) return '';
    const text = line(kind, extra);
    renderLine(text);
    return text;
  }
  function renderLine(text) {
    const p = $('dragonLine');
    p.replaceChildren();
    // *ações* aparecem em itálico; o restante é fala.
    for (const part of text.split(/(\*[^*]+\*)/g).filter(Boolean)) {
      if (/^\*.*\*$/.test(part)) {
        const em = document.createElement('em');
        em.textContent = part.slice(1, -1);
        p.append(em, ' ');
      } else p.append(p.childNodes.length ? part.replace(/^\s+/, '') : part);
    }
    const card = $('companionCard');
    card.classList.remove('speaking');
    void card.offsetWidth;
    card.classList.add('speaking');
  }
  const daysBetween = (a, b) => Math.round((C.parseDate(b) - C.parseDate(a)) / 864e5);
  function greet() {
    const c = CMP(),
      today = C.today();
    if (c.lastSeen && daysBetween(c.lastSeen, today) >= 3) speak('greetingReturn');
    else if (c.mood.date === today && c.mood.value) speak(moodKind(c.mood.value));
    else if (C.sessionDate() === today && C.sessionComplete()) speak('workoutDone');
    else if (C.isTrainingDay() || C.sessionDate() !== today) speak('greetingTraining');
    else speak('greetingRest');
    c.lastSeen = today;
  }
  const moodKind = (v) => ({ bem: 'moodBem', cansada: 'moodCansada', semEnergia: 'moodSemEnergia' })[v];

  function renderCompanion() {
    const c = CMP(),
      card = $('companionCard');
    card.hidden = !c.enabled;
    card.classList.toggle('silenced', c.silence);
    $('silenceToggle').setAttribute('aria-pressed', String(c.silence));
    $('silenceToggle').textContent = c.silence ? 'Despertar' : 'Silêncio';
    const today = C.today(),
      mood = c.mood.date === today ? c.mood.value : '';
    document.querySelectorAll('[data-mood]').forEach((b) => {
      b.classList.toggle('active', b.dataset.mood === mood);
      b.setAttribute('aria-pressed', String(b.dataset.mood === mood));
    });
    // Missão mínima: aeróbico e panturrilha do treino do dia, quando sem energia.
    const mm = $('minimalMission');
    const minimal = C.session().exercises.filter((x) =>
      /bicicleta|el[ií]ptico|panturrilha/i.test(x.name),
    );
    mm.hidden = !(mood === 'semEnergia' && minimal.length && !C.sessionComplete());
    if (!mm.hidden)
      mm.textContent = 'Missão mínima de hoje: ' + minimal.map((x) => x.name).join(' · ') + '.';
    const xp = $('xpLine');
    xp.hidden = !c.xp.enabled;
    if (c.xp.enabled) xp.textContent = 'XP de voo: ' + c.xp.total.toLocaleString('pt-BR');
  }
  function addXp(n) {
    const c = CMP();
    if (!c.xp.enabled) return;
    c.xp.total += n;
  }

  // ---------- Água ----------
  const fmtMl = (ml) =>
    ml >= 1000
      ? (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L'
      : ml + ' ml';
  const todayLog = () => (A().hydration[C.today()] ||= []);
  const waterTotal = (date = C.today()) =>
    (A().hydration[date] || []).filter((x) => x.kind === 'agua').reduce((n, x) => n + x.ml, 0);
  const otherTotal = (date = C.today()) =>
    (A().hydration[date] || []).filter((x) => x.kind !== 'agua').reduce((n, x) => n + x.ml, 0);
  function nowHHMM() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function logWater(ml, kind = 'agua') {
    ml = Math.round(ml);
    if (!(ml >= 10 && ml <= 3000)) return C.toast('Informe entre 10 e 3000 ml.');
    const goal = NUT().waterGoalMl,
      before = waterTotal();
    todayLog().push({ at: nowHHMM(), ml, kind });
    C.save();
    const after = waterTotal();
    C.toast(`${kind === 'agua' ? 'Água' : 'Outro líquido'}: +${ml} ml registrados.`);
    if (kind === 'agua' && goal && before < goal && after >= goal) speak('waterGoal');
    else speak('waterLogged');
    renderToday();
  }
  function undoWater() {
    const log = todayLog();
    const last = log.pop();
    if (!last) return C.toast('Nenhum registro de hoje para desfazer.');
    C.save();
    C.toast(`Registro de ${last.ml} ml desfeito.`);
    renderToday();
  }

  // ---------- Refeições e pausa de líquidos ----------
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const fromMin = (x) => {
    x = ((x % 1440) + 1440) % 1440;
    return pad(Math.floor(x / 60)) + ':' + pad(x % 60);
  };
  const sortedMeals = () => [...NUT().meals].sort((a, b) => toMin(a.time) - toMin(b.time));
  function pauseAt(min) {
    const p = NUT().pauseMin;
    if (!p) return null;
    return sortedMeals().find((m) => Math.abs(toMin(m.time) - min) <= p) || null;
  }
  function toggleMeal(id) {
    const log = (A().mealLog[C.today()] ||= []);
    const i = log.indexOf(id);
    if (i >= 0) log.splice(i, 1);
    else {
      log.push(id);
      const meal = NUT().meals.find((m) => m.id === id);
      speak('mealLogged', { refeicao: meal?.name || 'Refeição' });
    }
    C.save();
    renderToday();
  }
  function renderToday() {
    const goal = NUT().waterGoalMl,
      total = waterTotal(),
      other = otherTotal();
    $('waterCup').textContent = `+1 copo (${NUT().cupMl} ml)`;
    $('waterHalf').textContent = `+½ copo (${Math.round(NUT().cupMl / 2)} ml)`;
    $('waterTotal').textContent =
      (goal ? `${fmtMl(total)} de ${fmtMl(goal)}` : fmtMl(total)) +
      (other ? ` · outros líquidos ${fmtMl(other)}` : '');
    $('waterTrack').hidden = !goal;
    $('waterFill').style.width = goal ? Math.min(100, (total / goal) * 100) + '%' : '0';
    const now = toMin(nowHHMM()),
      pause = pauseAt(now);
    $('liquidPause').hidden = !pause;
    if (pause)
      $('liquidPause').textContent = line('liquidPause', {
        refeicao: pause.name.toLowerCase(),
        hora: pause.time,
        min: NUT().pauseMin,
      });
    const done = A().mealLog[C.today()] || [];
    const list = $('mealList');
    list.replaceChildren();
    const next = sortedMeals().find((m) => toMin(m.time) >= now - 30 && !done.includes(m.id));
    for (const m of sortedMeals()) {
      const row = document.createElement('label');
      row.className = 'meal-row' + (done.includes(m.id) ? ' done' : '') + (m === next ? ' next' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = done.includes(m.id);
      cb.addEventListener('change', () => toggleMeal(m.id));
      const text = document.createElement('span');
      const title = document.createElement('b');
      title.textContent = `${m.time} · ${m.name}`;
      text.append(title);
      if (m.plan) {
        const plan = document.createElement('small');
        plan.textContent = m.plan;
        text.append(plan);
      }
      row.append(cb, text);
      list.append(row);
    }
    if (!NUT().meals.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = 'Cadastre as refeições em Configurações → Alimentação e água.';
      list.append(p);
    }
    const hint = [goal ? `${Math.round((total / goal) * 100)}% da água` : fmtMl(total) + ' de água'];
    if (next) hint.push(`próxima: ${next.name} ${next.time}`);
    $('todayHint').textContent = hint.join(' · ');
  }

  // ---------- Lembretes ----------
  function buildSchedule() {
    const r = REM(),
      out = [];
    if (!r.enabled) return out;
    if (r.meals.enabled)
      for (const m of sortedMeals())
        out.push({ time: fromMin(toMin(m.time) - r.meals.before), kind: 'meal', meal: m.id });
    if (r.water.enabled)
      for (let t = toMin(r.water.start); t <= toMin(r.water.end); t += r.water.every) {
        if (r.skipPause && pauseAt(t)) continue;
        const time = fromMin(t);
        if (!out.some((x) => x.time === time)) out.push({ time, kind: 'water' });
      }
    return out.sort((a, b) => toMin(a.time) - toMin(b.time));
  }
  function reminderText(item) {
    if (item.kind === 'meal') {
      const m = NUT().meals.find((x) => x.id === item.meal);
      return line('mealReminder', { refeicao: (m?.name || 'Refeição').toLowerCase(), hora: m?.time || item.time });
    }
    return line('waterReminder');
  }
  // Rugido do Brolaith: "CC0 Deep Monster Roar" (trazzz123, OpenGameArt, domínio público),
  // cortado em 2,2 s. O iOS só libera áudio após um toque; o primeiro toque no app
  // destrava o som em silêncio. Com o app fechado, o iOS usa o som padrão do sistema.
  const roar = new Audio('./sounds/brolaith-roar.mp3');
  roar.preload = 'auto';
  let soundUnlocked = false;
  function unlockSound() {
    if (soundUnlocked) return;
    soundUnlocked = true;
    roar.muted = true;
    roar
      .play()
      .then(() => {
        // Se um rugido de verdade começou nesse meio-tempo (muted=false), não interrompe.
        if (!roar.muted) return;
        roar.pause();
        roar.currentTime = 0;
        roar.muted = false;
      })
      .catch(() => {
        roar.muted = false;
        soundUnlocked = false;
      });
  }
  document.addEventListener('pointerdown', unlockSound, { capture: true });
  function playRoar(force = false) {
    if (!force && !CMP().sound) return;
    try {
      roar.currentTime = 0;
      roar.muted = false;
      roar.play().catch(() => {});
    } catch (e) {}
  }
  async function notify(body, tag) {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg && 'Notification' in self && Notification.permission === 'granted')
      return reg.showNotification('Brolaith', {
        body,
        tag,
        icon: './icon-192.png',
        badge: './icon-192.png',
      });
    C.toast(body);
  }
  // Com o app aberto: verifica a cada 30 s. Com servidor conectado, o push cuida das
  // notificações e aqui só o Brolaith fala na tela.
  function tick() {
    const r = REM();
    if (!r.enabled) return;
    const today = C.today();
    if (r.fired.date !== today) r.fired = { date: today, keys: [] };
    const now = toMin(nowHHMM());
    for (const item of buildSchedule()) {
      const t = toMin(item.time),
        key = item.kind + item.time;
      if (t > now || now - t > 5 || r.fired.keys.includes(key)) continue;
      r.fired.keys.push(key);
      C.save();
      const text = reminderText(item);
      if (CMP().enabled && !CMP().silence) renderLine(text);
      if (document.visibilityState === 'visible') playRoar();
      if (!r.push.connected && document.visibilityState !== 'visible') notify(text, key);
      else if (!r.push.connected) C.toast(text);
    }
    renderToday();
  }
  // Configuração lida pelo service worker para escolher o texto do push.
  async function publishConfig() {
    try {
      const cache = await caches.open('sihaya-config');
      const payload = {
        treatment: CMP().treatment,
        schedule: buildSchedule(),
        meals: NUT().meals.map(({ id, name, time }) => ({ id, name, time })),
      };
      await cache.put(
        './sihaya-config.json',
        new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }),
      );
    } catch (e) {}
  }
  function permissionStatus() {
    const s = $('rmStatus');
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!('Notification' in self)) {
      s.textContent = /iphone|ipad/i.test(navigator.userAgent) && !standalone
        ? 'No iPhone, as notificações só funcionam com o SIHAYA adicionado à Tela de Início pelo Safari. Abra o app por lá e volte aqui.'
        : 'Este navegador não oferece notificações.';
      $('rmPermission').hidden = true;
      return;
    }
    const map = {
      granted: 'Notificações permitidas.',
      denied: 'Notificações bloqueadas. Libere nos ajustes do celular: Ajustes → Notificações → SIHAYA.',
      default: 'Toque em "Permitir notificações" para receber os lembretes.',
    };
    s.textContent = map[Notification.permission];
    $('rmPermission').hidden = Notification.permission !== 'default';
  }

  // ---------- Push (servidor Cloudflare) ----------
  const b64ToBytes = (b64) => {
    const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  };
  async function pushRequest(path, body) {
    const { url, key } = REM().push;
    if (!/^https:\/\//.test(url)) throw Error('Informe o endereço do servidor (https://...).');
    const res = await fetch(url.replace(/\/$/, '') + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw Error(res.status === 401 ? 'Chave de acesso incorreta.' : 'Servidor respondeu ' + res.status + '.');
    return res.json().catch(() => ({}));
  }
  async function pushSync(manual = false) {
    const status = $('rmPushStatus');
    try {
      if (!('Notification' in self) || !('PushManager' in self))
        throw Error(
          'no iPhone, abra o SIHAYA pelo ícone da Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início). Dentro do navegador o iOS não permite notificações.',
        );
      if (Notification.permission !== 'granted') throw Error('Permita as notificações primeiro.');
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await pushRequest('/vapid');
      let sub = await reg.pushManager.getSubscription();
      if (!sub)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToBytes(publicKey),
        });
      await pushRequest('/subscribe', {
        subscription: sub.toJSON(),
        schedule: REM().enabled ? buildSchedule().map(({ time, kind }) => ({ time, kind })) : [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      REM().push.connected = true;
      C.save();
      status.textContent = `Conectado. ${buildSchedule().length} lembretes por dia enviados ao servidor.`;
    } catch (e) {
      if (manual) status.textContent = 'Não foi possível conectar: ' + (e.message || e);
    }
  }
  let syncTimer = null;
  function scheduleChanged() {
    publishConfig();
    renderPreview();
    if (REM().push.connected) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => pushSync(false), 1500);
    }
  }
  function renderPreview() {
    const s = buildSchedule();
    $('rmPreview').textContent = REM().enabled
      ? `${s.filter((x) => x.kind === 'water').length} lembretes de água e ${s.filter((x) => x.kind === 'meal').length} de refeições por dia.`
      : 'Lembretes desligados.';
  }

  // ---------- Configurações ----------
  function bind(id, get, set, evt = 'change') {
    const el = $(id);
    const isCheck = el.type === 'checkbox';
    if (isCheck) el.checked = !!get();
    else el.value = get() ?? '';
    el.addEventListener(evt, () => {
      set(isCheck ? el.checked : el.value);
      C.save();
    });
  }
  function renderMealConfig() {
    const box = $('mealConfig');
    box.replaceChildren();
    for (const m of sortedMeals()) {
      const row = document.createElement('div');
      row.className = 'meal-config-row';
      const time = document.createElement('input');
      time.type = 'time';
      time.value = m.time;
      time.setAttribute('aria-label', 'Horário de ' + m.name);
      const name = document.createElement('input');
      name.type = 'text';
      name.value = m.name;
      name.maxLength = 40;
      name.setAttribute('aria-label', 'Nome da refeição');
      const plan = document.createElement('input');
      plan.type = 'text';
      plan.value = m.plan;
      plan.maxLength = 160;
      plan.placeholder = 'O que comer (opcional)';
      plan.setAttribute('aria-label', 'Plano de ' + m.name);
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Remover';
      time.addEventListener('change', () => {
        if (!validTime(time.value)) return;
        m.time = time.value;
        C.save();
        renderMealConfig();
        renderToday();
        scheduleChanged();
      });
      name.addEventListener('change', () => {
        m.name = name.value.trim() || 'Refeição';
        C.save();
        renderToday();
        scheduleChanged();
      });
      plan.addEventListener('change', () => {
        m.plan = plan.value.trim();
        C.save();
        renderToday();
      });
      del.addEventListener('click', () => {
        if (!confirm(`Remover "${m.name}" das refeições?`)) return;
        NUT().meals = NUT().meals.filter((x) => x !== m);
        C.save();
        renderMealConfig();
        renderToday();
        scheduleChanged();
      });
      row.append(time, name, del, plan);
      box.append(row);
    }
  }
  function setupSettings() {
    const sel = $('cmpTreatment');
    for (const t of self.BROLAITH.treatments) {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      sel.append(o);
    }
    bind('cmpEnabled', () => CMP().enabled, (v) => {
      CMP().enabled = v;
      renderCompanion();
      if (v) greet();
    });
    bind('cmpTreatment', () => CMP().treatment, (v) => {
      CMP().treatment = v;
      publishConfig();
    });
    bind('cmpXp', () => CMP().xp.enabled, (v) => {
      CMP().xp.enabled = v;
      renderCompanion();
    });
    bind('cmpSound', () => CMP().sound, (v) => (CMP().sound = v));
    $('cmpSoundTest').addEventListener('click', () => playRoar(true));
    const p = A().profile;
    bind('pfHeight', () => p.heightCm, (v) => (p.heightCm = v ? num(v, 100, 230, '') : ''));
    bind('pfWeight', () => p.weightKg, (v) => {
      p.weightKg = v ? num(v, 30, 300, '') : '';
      p.weightDate = C.today();
      weightDate();
    });
    const weightDate = () =>
      ($('pfWeightDate').textContent = p.weightDate
        ? 'Peso atualizado em ' + C.parseDate(p.weightDate).toLocaleDateString('pt-BR') + '.'
        : '');
    weightDate();
    bind('pfSurgery', () => p.surgery, (v) => (p.surgery = v));
    bind('pfSurgeryDate', () => p.surgeryDate, (v) => (p.surgeryDate = v));
    bind('pfNotes', () => p.notes, (v) => (p.notes = v));
    const n = NUT();
    bind('ntWaterGoal', () => n.waterGoalMl, (v) => {
      n.waterGoalMl = v ? num(v, 500, 5000, '') : '';
      renderToday();
    });
    bind('ntCup', () => n.cupMl, (v) => {
      n.cupMl = num(v, 50, 2000, 800);
      renderToday();
    });
    bind('ntPause', () => n.pauseMin, (v) => {
      n.pauseMin = num(v, 0, 120, 30);
      renderToday();
      scheduleChanged();
    });
    bind('ntDiet', () => n.diet, (v) => (n.diet = v));
    $('mealAdd').addEventListener('click', () => {
      NUT().meals.push({ id: 'm' + Date.now().toString(36), name: 'Refeição', time: '16:00', plan: '' });
      C.save();
      renderMealConfig();
      renderToday();
      scheduleChanged();
    });
    renderMealConfig();
    const r = REM();
    const after = () => {
      renderPreview();
      scheduleChanged();
    };
    bind('rmEnabled', () => r.enabled, (v) => {
      r.enabled = v;
      after();
    });
    bind('rmWater', () => r.water.enabled, (v) => {
      r.water.enabled = v;
      after();
    });
    bind('rmEvery', () => r.water.every, (v) => {
      r.water.every = num(v, 15, 240, 60);
      after();
    });
    bind('rmStart', () => r.water.start, (v) => {
      if (validTime(v)) r.water.start = v;
      after();
    });
    bind('rmEnd', () => r.water.end, (v) => {
      if (validTime(v)) r.water.end = v;
      after();
    });
    bind('rmSkipPause', () => r.skipPause, (v) => {
      r.skipPause = v;
      after();
    });
    bind('rmMeals', () => r.meals.enabled, (v) => {
      r.meals.enabled = v;
      after();
    });
    bind('rmBefore', () => String(r.meals.before), (v) => {
      r.meals.before = num(v, 0, 60, 0);
      after();
    });
    bind('rmPushUrl', () => r.push.url, (v) => {
      r.push.url = v.trim();
      r.push.connected = false;
    });
    bind('rmPushKey', () => r.push.key, (v) => {
      r.push.key = v.trim();
      r.push.connected = false;
    });
    $('rmPermission').addEventListener('click', async () => {
      try {
        await Notification.requestPermission();
      } catch (e) {}
      permissionStatus();
    });
    $('rmPushSync').addEventListener('click', () => pushSync(true));
    $('rmPushTest').addEventListener('click', async () => {
      try {
        await pushRequest('/test', {});
        $('rmPushStatus').textContent = 'Teste enviado. A notificação deve chegar em instantes.';
      } catch (e) {
        $('rmPushStatus').textContent = 'Falha no teste: ' + (e.message || e);
      }
    });
    if (r.push.connected) $('rmPushStatus').textContent = 'Conectado ao servidor de notificações.';
    permissionStatus();
    renderPreview();
  }
  for (const id of ['companionSet', 'profile', 'diet', 'reminders', 'today'])
    $(id + 'Toggle').addEventListener('click', () => {
      const btn = $(id + 'Toggle'),
        open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      $(id + 'Body').hidden = open;
      if (id === 'reminders' && !open) permissionStatus();
    });

  // ---------- Eventos ----------
  $('dragonTap').addEventListener('click', () => speak('tap', {}, { force: false }) || null);
  $('silenceToggle').addEventListener('click', () => {
    const c = CMP();
    c.silence = !c.silence;
    C.save();
    renderLine(line(c.silence ? 'silenceOn' : 'silenceOff'));
    renderCompanion();
  });
  document.querySelectorAll('[data-mood]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = CMP(),
        today = C.today();
      const same = c.mood.date === today && c.mood.value === b.dataset.mood;
      c.mood = same ? { date: '', value: '' } : { date: today, value: b.dataset.mood };
      C.save();
      renderCompanion();
      if (!same) speak(moodKind(b.dataset.mood));
    }),
  );
  $('waterCup').addEventListener('click', () => logWater(NUT().cupMl));
  $('waterHalf').addEventListener('click', () => logWater(NUT().cupMl / 2));
  $('waterUndo').addEventListener('click', undoWater);
  $('waterOtherToggle').addEventListener('click', () => {
    const box = $('waterOther');
    box.hidden = !box.hidden;
    $('waterOtherToggle').setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) $('waterMl').focus();
  });
  $('waterAdd').addEventListener('click', () => {
    logWater(Number($('waterMl').value), $('waterKind').value);
    $('waterMl').value = '';
  });
  let setCount = 0;
  window.addEventListener('sihaya:set-done', () => {
    addXp(5);
    // Fala só de vez em quando nas séries, para não virar ruído.
    if (++setCount % 3 === 0) speak('setDone');
    renderCompanion();
  });
  window.addEventListener('sihaya:exercise-done', (e) => {
    addXp(10);
    speak('exerciseDone', { exercicio: e.detail.exercise });
    renderCompanion();
  });
  window.addEventListener('sihaya:workout-done', () => {
    addXp(30);
    speak('workoutDone');
    renderCompanion();
  });
  window.addEventListener('sihaya:feedback-saved', () => speak('feedbackSaved'));
  window.addEventListener('sihaya:level-ready', (e) => {
    const c = CMP(),
      key = C.today() + e.detail.level;
    if (c.levelNotice === key) return;
    c.levelNotice = key;
    C.save();
    speak('levelReady', { nivel: e.detail.level });
  });
  window.addEventListener('sihaya:session-changed', () => {
    renderCompanion();
    if (C.sessionDate() !== C.today()) speak('greetingTraining');
  });
  // Clique numa notificação abre o app; o service worker avisa qual lembrete foi.
  navigator.serviceWorker?.addEventListener?.('message', (e) => {
    if (e.data?.type === 'reminder' && e.data.text) renderLine(e.data.text);
  });

  // ---------- Início ----------
  setupSettings();
  renderCompanion();
  renderToday();
  greet();
  C.save();
  publishConfig();
  tick();
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      renderToday();
      tick();
    }
  });
})();
