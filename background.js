// ============================================================
//  Teams Status Notifier - Background Service Worker
//  Dispatcher: invia tramite Telegram o Pushover a seconda
//  del provider attivo configurato nella popup.
// ============================================================

const TELEGRAM_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;
const PUSHOVER_API = 'https://api.pushover.net/1/messages.json';

async function getConfig() {
  return new Promise(resolve => {
    chrome.storage.local.get([
      'provider', 'enabled',
      // Telegram
      'telegramToken', 'chatId',
      // Pushover
      'apiToken', 'userKey'
    ], resolve);
  });
}

// ────────────────────────────────────────────────────────────
//  TELEGRAM
// ────────────────────────────────────────────────────────────

async function sendTelegram({ title, body }) {
  const { telegramToken, chatId } = await getConfig();

  if (!telegramToken || !chatId) {
    return { ok: false, error: 'Telegram non configurato (Bot Token o Chat ID mancante)' };
  }

  const text = `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`;

  try {
    const response = await fetch(TELEGRAM_API(telegramToken), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await response.json();
    if (!data.ok) {
      return { ok: false, error: data.description || 'Errore Telegram' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ────────────────────────────────────────────────────────────
//  PUSHOVER
// ────────────────────────────────────────────────────────────

async function sendPushover({ title, body }) {
  const { apiToken, userKey } = await getConfig();

  if (!apiToken || !userKey) {
    return { ok: false, error: 'Pushover non configurato (API Token o User Key mancante)' };
  }

  const params = new URLSearchParams({
    token: apiToken,
    user: userKey,
    title,
    message: body,
    priority: '0'
  });

  try {
    const response = await fetch(PUSHOVER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await response.json();
    if (!response.ok || data.status !== 1) {
      return { ok: false, error: (data.errors || ['Errore Pushover']).join(', ') };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ────────────────────────────────────────────────────────────
//  DISPATCHER: sceglie il provider attivo
// ────────────────────────────────────────────────────────────

async function dispatch(payload) {
  const { provider } = await getConfig();
  const active = provider || 'telegram'; // default: telegram

  console.log(`[TeamsNotifier] Invio tramite: ${active}`);

  if (active === 'pushover') {
    return await sendPushover(payload);
  }
  return await sendTelegram(payload);
}

// ────────────────────────────────────────────────────────────
//  Listener
// ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'NEW_MESSAGE') {
    dispatch({
      title: `💬 ${msg.sender}`,
      body: `Nuovo messaggio Teams\nTuo stato: ${msg.status || 'sconosciuto'}`
    });
    return;
  }

  if (msg.type === 'TEST_NOTIFICATION') {
    // Testa il provider specificato (passato dalla popup),
    // altrimenti quello attualmente attivo
    const fn = msg.provider === 'pushover' ? sendPushover :
               msg.provider === 'telegram' ? sendTelegram :
               dispatch;
    fn({
      title: '✅ Teams Status Notifier',
      body: `Test riuscito (${msg.provider || 'provider attivo'})!`
    }).then(sendResponse);
    return true;
  }
});
