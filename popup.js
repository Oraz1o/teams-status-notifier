// ============================================================
//  Teams Status Notifier - Popup
//  Gestisce 2 provider: Telegram e Pushover
// ============================================================

const tabs           = document.querySelectorAll('.tab');
const sections       = document.querySelectorAll('.provider-section');
const toggle         = document.getElementById('enabledToggle');
const statusEl       = document.getElementById('status');
const activeLabel    = document.getElementById('activeProviderLabel');

// Input fields
const telegramTokenInput = document.getElementById('telegramToken');
const chatIdInput        = document.getElementById('chatId');
const apiTokenInput      = document.getElementById('apiToken');
const userKeyInput       = document.getElementById('userKey');

const PROVIDER_NAMES = {
  telegram: 'Telegram',
  pushover: 'Pushover'
};

let currentTab = 'telegram'; // tab visualizzato (non necessariamente l'attivo)

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  if (type === 'success') {
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 3000);
  }
}

function isValidPushoverKey(s) {
  return /^[A-Za-z0-9]{30}$/.test(s);
}

function setActiveTab(provider) {
  currentTab = provider;
  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.provider === provider);
  });
  sections.forEach(s => {
    s.classList.toggle('active', s.id === `section-${provider}`);
  });
}

function setActiveProvider(provider) {
  chrome.storage.local.set({ provider }, () => {
    activeLabel.textContent = PROVIDER_NAMES[provider];
  });
}

// ────────────────────────────────────────────────────────────
//  Caricamento configurazione
// ────────────────────────────────────────────────────────────

chrome.storage.local.get([
  'provider', 'enabled',
  'telegramToken', 'chatId',
  'apiToken', 'userKey'
], (data) => {
  // Toggle on/off
  toggle.checked = data.enabled !== false;

  // Provider attivo (default: telegram)
  const active = data.provider || 'telegram';
  setActiveTab(active);
  activeLabel.textContent = PROVIDER_NAMES[active];

  // Popola i campi
  if (data.telegramToken) telegramTokenInput.value = data.telegramToken;
  if (data.chatId)        chatIdInput.value        = data.chatId;
  if (data.apiToken)      apiTokenInput.value      = data.apiToken;
  if (data.userKey)       userKeyInput.value       = data.userKey;
});

// ────────────────────────────────────────────────────────────
//  Cambio tab
//  Cliccare un tab cambia ANCHE il provider attivo
//  (così l'utente capisce immediatamente qual è in uso)
// ────────────────────────────────────────────────────────────

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const provider = tab.dataset.provider;
    setActiveTab(provider);
    setActiveProvider(provider);
    setStatus(`🔄 Provider attivo: ${PROVIDER_NAMES[provider]}`, 'info');
  });
});

// ────────────────────────────────────────────────────────────
//  Toggle on/off
// ────────────────────────────────────────────────────────────

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: toggle.checked }, () => {
    setStatus(
      toggle.checked ? '🟢 Notifiche attive' : '⚫ Notifiche disattivate',
      'info'
    );
  });
});

// ────────────────────────────────────────────────────────────
//  Salva (per provider)
// ────────────────────────────────────────────────────────────

document.querySelectorAll('.save-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const provider = btn.dataset.provider;

    if (provider === 'telegram') {
      const token  = telegramTokenInput.value.trim();
      const chatId = chatIdInput.value.trim();
      if (!token || !chatId) {
        setStatus('⚠️ Compila Bot Token e Chat ID', 'error');
        return;
      }
      chrome.storage.local.set({
        telegramToken: token,
        chatId: chatId
      }, () => setStatus('✅ Telegram salvato', 'success'));

    } else if (provider === 'pushover') {
      const apiToken = apiTokenInput.value.trim();
      const userKey  = userKeyInput.value.trim();
      if (!apiToken || !userKey) {
        setStatus('⚠️ Compila API Token e User Key', 'error');
        return;
      }
      if (!isValidPushoverKey(apiToken) || !isValidPushoverKey(userKey)) {
        setStatus('⚠️ Le chiavi Pushover devono essere 30 caratteri alfanumerici', 'error');
        return;
      }
      chrome.storage.local.set({
        apiToken,
        userKey
      }, () => setStatus('✅ Pushover salvato', 'success'));
    }
  });
});

// ────────────────────────────────────────────────────────────
//  Test (per provider, non cambia il provider attivo)
// ────────────────────────────────────────────────────────────

document.querySelectorAll('.test-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const provider = btn.dataset.provider;

    // Salva eventuali modifiche del form prima del test
    const savePayload = {};
    if (provider === 'telegram') {
      const token  = telegramTokenInput.value.trim();
      const chatId = chatIdInput.value.trim();
      if (!token || !chatId) {
        setStatus('⚠️ Compila prima i campi Telegram', 'error');
        return;
      }
      savePayload.telegramToken = token;
      savePayload.chatId = chatId;
    } else {
      const apiToken = apiTokenInput.value.trim();
      const userKey  = userKeyInput.value.trim();
      if (!apiToken || !userKey) {
        setStatus('⚠️ Compila prima i campi Pushover', 'error');
        return;
      }
      savePayload.apiToken = apiToken;
      savePayload.userKey = userKey;
    }

    setStatus(`⏳ Invio test ${PROVIDER_NAMES[provider]}...`, 'info');

    chrome.storage.local.set(savePayload, () => {
      chrome.runtime.sendMessage(
        { type: 'TEST_NOTIFICATION', provider },
        (response) => {
          if (chrome.runtime.lastError) {
            setStatus('❌ ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          if (response && response.ok) {
            setStatus(`✅ Test ${PROVIDER_NAMES[provider]} inviato!`, 'success');
          } else {
            setStatus(`❌ ${response?.error || 'Errore sconosciuto'}`, 'error');
          }
        }
      );
    });
  });
});
