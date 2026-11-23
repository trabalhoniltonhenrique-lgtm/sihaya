/* SIHAYA 2.1 | Sincronização manual e backup automático semanal (opt-in).
   OAuth via Google Identity Services. O token fica exclusivamente em memória. */
(() => {
  'use strict';
  const DATA_KEY = 'kanban-lavanda-semanal-v3';
  const SETTINGS_KEY = 'sihaya-drive-v2-1-settings';
  const BACKUP_NAME = 'sihaya-backup-v2-1.json';
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const AUTO_DELAY_MS = 15000;
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const $ = (id) => document.getElementById(id);
  let settings = {
    clientId: '',
    auto: true,
    lastFileId: '',
    lastModified: '',
    lastSync: '',
    lastUpload: '',
  };
  try {
    const p = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (p && typeof p === 'object') settings = { ...settings, ...p };
  } catch {}
  // Migração: versões anteriores registravam o envio bem-sucedido em lastSync.
  if (!settings.lastUpload && settings.lastSync && settings.lastFileId)
    settings.lastUpload = settings.lastSync;
  let accessToken = null,
    tokenUntil = 0,
    tokenClient = null,
    busy = false,
    autoTimer = null;
  const message = (text) => {
    $('driveStatus').textContent = text;
  };
  const store = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  };
  const connected = () => !!accessToken && Date.now() < tokenUntil;
  const isSecure = () =>
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
  function controls() {
    const conn = connected();
    $('driveConnect').textContent = conn ? 'Renovar acesso Google' : 'Conectar Google';
    $('driveDisconnect').disabled = !conn || busy;
    $('driveUpload').disabled = !conn || busy;
    $('driveDownload').disabled = !conn || busy;
    $('driveAuto').checked = !!settings.auto;
    $('driveAuto').disabled = busy;
    const last = Date.parse(settings.lastUpload || '');
    const lastText = Number.isFinite(last)
      ? 'Último envio ao Drive: ' + new Date(last).toLocaleString('pt-BR')
      : 'Ainda não há backup enviado nesta instalação.';
    const nextText = settings.auto
      ? Number.isFinite(last)
        ? 'Próximo envio automático: a partir de ' +
          new Date(last + WEEK_MS).toLocaleString('pt-BR') +
          '.'
        : 'Primeiro envio automático: assim que conectar ao Google Drive.'
      : 'Sincronização semanal desativada.';
    $('driveLastSync').textContent =
      lastText + ' ' + nextText + ' O app precisa estar aberto, online e autorizado.';
  }
  function failText(e) {
    return e?.message || 'Erro inesperado.';
  }
  async function api(url, opts = {}) {
    if (!connected()) throw Error('Sua autorização expirou. Clique em Conectar Google novamente.');
    let res;
    try {
      res = await fetch(url, {
        ...opts,
        headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) },
        cache: 'no-store',
      });
    } catch {
      throw Error(
        'Sem conexão com a internet ou falha de rede. Seus dados locais foram preservados.',
      );
    }
    if (!res.ok) {
      let reason = '';
      try {
        const j = await res.json();
        reason = j?.error?.message || '';
      } catch {}
      if (res.status === 401) {
        accessToken = null;
        tokenUntil = 0;
        controls();
        throw Error('A autorização do Google expirou. Reconecte sua conta.');
      }
      throw Error('Google Drive: ' + res.status + (reason ? ' — ' + reason : ''));
    }
    return res;
  }
  function setBusy(value) {
    busy = value;
    controls();
  }
  function backupPayload() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(DATA_KEY));
    } catch {}
    if (!data || !data.sessions || !data.templates)
      throw Error('O histórico local ainda não está disponível para backup.');
    return JSON.stringify({
      format: 'kanban-lavanda-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data,
    });
  }
  function safeBackup(json) {
    let raw;
    try {
      raw = JSON.parse(json);
    } catch {
      throw Error('O arquivo remoto não contém JSON válido.');
    }
    if (
      raw?.format !== 'kanban-lavanda-backup' ||
      raw?.version !== 2 ||
      !raw?.data ||
      typeof raw.data !== 'object' ||
      !raw.data.sessions ||
      typeof raw.data.sessions !== 'object' ||
      Array.isArray(raw.data.sessions) ||
      !raw.data.templates ||
      typeof raw.data.templates !== 'object' ||
      !Array.isArray(raw.data.activeDays)
    )
      throw Error('Backup remoto inválido ou incompatível.');
    if (Object.keys(raw.data.sessions).length > 15000)
      throw Error('O backup contém registros demais.');
    for (const [date, s] of Object.entries(raw.data.sessions))
      if (
        !/^\d{4}-\d\d-\d\d$/.test(date) ||
        !s ||
        !Array.isArray(s.exercises) ||
        s.exercises.length > 200
      )
        throw Error('O backup contém sessões inválidas.');
    return raw.data;
  }
  async function remote() {
    const q = new URLSearchParams({
      spaces: 'appDataFolder',
      q: `name = '${BACKUP_NAME}' and trashed = false`,
      fields: 'nextPageToken,files(id,name,modifiedTime,size)',
      pageSize: '100',
    });
    const r = await api(API + '?' + q.toString());
    const obj = await r.json();
    const files = obj.files || [];
    if (files.length > 1)
      throw Error(
        'Há mais de um backup SIHAYA no Drive. Resolva as duplicatas antes de sincronizar.',
      );
    return files[0] || null;
  }
  async function saveRemote(contents, existing) {
    if (existing) {
      const r = await api(
        UPLOAD +
          '/' +
          encodeURIComponent(existing.id) +
          '?uploadType=media&fields=id,name,modifiedTime',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: contents },
      );
      return await r.json();
    }
    const boundary = 'sihaya_' + Math.random().toString(36).slice(2);
    const body =
      '--' +
      boundary +
      '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({
        name: BACKUP_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      }) +
      '\r\n--' +
      boundary +
      '\r\nContent-Type: application/json\r\n\r\n' +
      contents +
      '\r\n--' +
      boundary +
      '--';
    const r = await api(UPLOAD + '?uploadType=multipart&fields=id,name,modifiedTime', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body,
    });
    return await r.json();
  }
  async function upload(isAuto = false) {
    if (busy) return;
    setBusy(true);
    message('Verificando backup no Google Drive...');
    try {
      const contents = backupPayload();
      const found = await remote();
      if (found) {
        const sameBase =
          settings.lastFileId === found.id && settings.lastModified === found.modifiedTime;
        if (!sameBase) {
          message(
            'Proteção ativada: há um backup no Drive que esta instalação ainda não reconhece ou que foi alterado em outro aparelho. Restaure do Drive primeiro ou faça backup JSON dos dados locais. Nada foi sobrescrito.',
          );
          return;
        }
      }
      const uploaded = await saveRemote(contents, found);
      if (!uploaded?.id) throw Error('O Google Drive não confirmou a gravação.');
      // Busca metadados novamente para armazenar o timestamp efetivo confirmado.
      const check = await remote();
      if (!check) throw Error('O backup foi enviado, mas não foi localizado para confirmação.');
      settings.lastFileId = check.id;
      settings.lastModified = check.modifiedTime;
      settings.lastSync = new Date().toISOString();
      settings.lastUpload = settings.lastSync;
      store();
      controls();
      message(
        'Backup enviado com sucesso. O próximo envio automático poderá ocorrer em 7 dias, com o app aberto e conectado.',
      );
    } catch (e) {
      message('Não foi possível enviar: ' + failText(e));
      if (!isAuto) console.warn('SIHAYA Drive:', failText(e));
    } finally {
      setBusy(false);
      if (
        Number.isFinite(Date.parse(settings.lastUpload || '')) &&
        Date.now() - Date.parse(settings.lastUpload) < WEEK_MS
      )
        scheduleAuto();
    }
  }
  async function download() {
    if (busy) return;
    setBusy(true);
    message('Procurando seu backup no Google Drive...');
    try {
      const f = await remote();
      if (!f) {
        message('Nenhum backup SIHAYA encontrado nesta conta Google.');
        return;
      }
      const r = await api(API + '/' + encodeURIComponent(f.id) + '?alt=media');
      const body = await r.text();
      if (body.length > 15 * 1024 * 1024) throw Error('Backup remoto muito grande para importar.');
      const data = safeBackup(body);
      if (
        !confirm(
          'Restaurar o backup do Google Drive? ISSO SUBSTITUI todos os treinos e sintomas salvos neste aparelho. Exporte um backup JSON local antes, caso queira preservá-los.',
        )
      ) {
        message('Restauração cancelada. Nenhum dado foi alterado.');
        return;
      }
      const previous = localStorage.getItem(DATA_KEY);
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
      } catch (e) {
        if (previous !== null) localStorage.setItem(DATA_KEY, previous);
        throw Error(
          'Sem espaço de armazenamento para restaurar; os dados anteriores foram mantidos.',
        );
      }
      settings.lastFileId = f.id;
      settings.lastModified = f.modifiedTime;
      settings.lastSync = new Date().toISOString();
      store();
      message('Backup restaurado. Recarregando treinos...');
      location.reload();
    } catch (e) {
      message('Não foi possível restaurar: ' + failText(e));
    } finally {
      setBusy(false);
      scheduleAuto();
    }
  }
  async function disconnect() {
    clearTimeout(autoTimer);
    autoTimer = null;
    const old = accessToken;
    accessToken = null;
    tokenUntil = 0;
    tokenClient = null;
    if (old && window.google?.accounts?.oauth2) {
      try {
        google.accounts.oauth2.revoke(old, () => {});
      } catch {}
    }
    message('Desconectado do Google Drive. Seus treinos locais continuam disponíveis.');
    controls();
  }
  function connect() {
    if (!isSecure()) {
      message(
        'Para autorizar o Google, publique o aplicativo em HTTPS (ou execute em localhost). O arquivo aberto por file:// não pode conectar.',
      );
      return;
    }
    if (!navigator.onLine) {
      message('Conecte-se à internet para autorizar sua conta Google.');
      return;
    }
    const clientId = $('googleClientId').value.trim();
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      message('Informe um ID de cliente OAuth válido do Google Cloud.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      message(
        'Não foi possível carregar o login do Google. Verifique sua conexão e tente novamente.',
      );
      return;
    }
    settings.clientId = clientId;
    store();
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) {
            message('Google não autorizou o acesso: ' + response.error);
            return;
          }
          if (!response.access_token) {
            message('Google não retornou autorização.');
            return;
          }
          accessToken = response.access_token;
          tokenUntil = Date.now() + (Number(response.expires_in) || 3500) * 1000 - 60000;
          message(
            'Google Drive conectado. O backup semanal será verificado; Enviar backup continua disponível a qualquer momento.',
          );
          controls();
          scheduleAuto();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      message('Não foi possível iniciar o login: ' + failText(e));
    }
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    autoTimer = null;
    if (!settings.auto || !connected() || busy || !navigator.onLine) return;
    const last = Date.parse(settings.lastUpload || '');
    const due = Number.isFinite(last) ? last + WEEK_MS : 0;
    const remaining = Math.max(0, due - Date.now());
    // Um cronômetro longo não depende de execução em segundo plano: ao voltar à página,
    // reconectar ou recuperar a internet, a data de vencimento é conferida novamente.
    const delay = Math.min(2147483647, remaining ? remaining : AUTO_DELAY_MS);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (!settings.auto || !connected() || busy || !navigator.onLine) return;
      const latest = Date.parse(settings.lastUpload || '');
      if (!Number.isFinite(latest) || Date.now() - latest >= WEEK_MS) upload(true);
      else scheduleAuto();
    }, delay);
  }
  $('driveToggle').addEventListener('click', () => {
    const b = $('driveToggle'),
      body = $('driveBody'),
      open = b.getAttribute('aria-expanded') === 'true';
    body.hidden = open;
    b.setAttribute('aria-expanded', String(!open));
  });
  $('googleClientId').value = settings.clientId || '';
  $('googleClientId').addEventListener('change', () => {
    settings.clientId = $('googleClientId').value.trim();
    store();
  });
  $('driveConnect').addEventListener('click', connect);
  $('driveDisconnect').addEventListener('click', disconnect);
  $('driveUpload').addEventListener('click', () => upload());
  $('driveDownload').addEventListener('click', download);
  $('driveAuto').addEventListener('change', (e) => {
    settings.auto = !!e.target.checked;
    store();
    if (settings.auto) {
      message(
        'Backup semanal ativado: um envio a cada 7 dias, quando o app estiver aberto, online e conectado.',
      );
      scheduleAuto();
    } else {
      clearTimeout(autoTimer);
      autoTimer = null;
      message('Backup semanal desativado. O envio manual continua disponível.');
    }
    controls();
  });
  // Alterações locais permanecem offline e serão incluídas no próximo envio semanal.
  window.addEventListener('sihaya:data-changed', scheduleAuto);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleAuto();
  });
  window.addEventListener('focus', scheduleAuto);
  window.addEventListener('online', () => {
    if (settings.auto && connected()) scheduleAuto();
  });
  if (!isSecure())
    message(
      'Modo local: para conectar ao Google Drive, publique os arquivos em um endereço HTTPS.',
    );
  controls();
})();
