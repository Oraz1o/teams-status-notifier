// ============================================================
//  Teams Status Notifier - Content Script
//  Gira dentro la PWA di Teams e osserva il DOM
// ============================================================

const SELECTORS = {
  // Indicatore stato sempre visibile (in alto a destra, sull'avatar)
  myPresence: '[data-tid="me-control-avatar-presence"]',
  myAvatarTrigger: '[data-tid="me-control-avatar-trigger"]',
  // Container di una chat nella lista
  chatItem: '[data-inp="simple-collab-chat-switch"]',
  // Titolo della chat (id stabile)
  chatTitle: '[id^="title-chat-list-item_"]'
};

// Stati Teams che NON considero "disponibile" → notifico
// Tutto ciò che NON è nella lista qui sotto attiva le notifiche
const AVAILABLE_LABELS = ['available', 'disponibile'];

let currentStatus = null;
const notifiedChats = new Set();   // chat per cui ho già notificato
let extensionEnabled = true;       // toggle on/off
let initialScanDone = false;       // evita notifiche al primo avvio

// ────────────────────────────────────────────────────────────
//  STATO UTENTE
// ────────────────────────────────────────────────────────────

function getMyStatus() {
  // Prima prova: aria-label sul pallino di presenza
  const badge = document.querySelector(SELECTORS.myPresence);
  if (badge) {
    const label = badge.getAttribute('aria-label');
    if (label) return label.trim();
  }

  // Fallback: aria-label sul bottone avatar (es. "Profilo, stato Disponibile")
  const trigger = document.querySelector(SELECTORS.myAvatarTrigger);
  if (trigger) {
    const label = trigger.getAttribute('aria-label') || '';
    const match = label.match(/stato\s+(.+?)(?:\s|$)/i);
    if (match) return match[1].trim();
  }

  return null;
}

function isAvailable(status) {
  if (!status) return true; // se non lo so, evito di spammare
  const s = status.toLowerCase();
  return AVAILABLE_LABELS.some(a => s.includes(a));
}

// ────────────────────────────────────────────────────────────
//  CHAT NON LETTE
//  Strategia: confronto il font-weight calcolato del titolo.
//  Le chat non lette hanno il nome in grassetto (≥ 600).
// ────────────────────────────────────────────────────────────

function findUnreadChats() {
  const titles = document.querySelectorAll(SELECTORS.chatTitle);
  const unread = [];

  titles.forEach(titleEl => {
    // Risali al container della chat per stabilità
    const container = titleEl.closest(SELECTORS.chatItem);
    if (!container) return;

    // Determina il "peso" del font: il grassetto può essere applicato
    // sul titolo stesso o su un genitore
    const weight = parseInt(window.getComputedStyle(titleEl).fontWeight, 10);
    if (weight >= 600) {
      const id = titleEl.id; // es. "title-chat-list-item_19:..."
      const sender = titleEl.textContent.trim();
      unread.push({ id, sender });
    }
  });

  return unread;
}

// ────────────────────────────────────────────────────────────
//  LOOP PRINCIPALE
// ────────────────────────────────────────────────────────────

function tick() {
  if (!extensionEnabled) return;

  // Aggiorna lo stato
  const status = getMyStatus();
  if (status) currentStatus = status;

  // Trova le chat non lette correnti
  const unread = findUnreadChats();
  const currentUnreadIds = new Set(unread.map(c => c.id));

  // Pulisci dal set le chat che sono state lette nel frattempo
  // (così se arriva un nuovo messaggio, ti rinotifico)
  for (const id of notifiedChats) {
    if (!currentUnreadIds.has(id)) {
      notifiedChats.delete(id);
    }
  }

  // Al primo giro NON notifico nulla: registro solo lo stato attuale
  // (evita raffica di notifiche quando apri Teams con chat già non lette)
  if (!initialScanDone) {
    unread.forEach(c => notifiedChats.add(c.id));
    initialScanDone = true;
    console.log('[TeamsNotifier] Avvio: stato =', currentStatus,
                '| chat non lette ignorate =', unread.length);
    return;
  }

  // Se sono "Disponibile", non notifico ma tengo aggiornato il set
  // così non mi arriva un'ondata appena cambio stato
  if (isAvailable(currentStatus)) {
    unread.forEach(c => notifiedChats.add(c.id));
    return;
  }

  // Sono in uno stato "non disponibile": notifica le chat nuove
  unread.forEach(({ id, sender }) => {
    if (!notifiedChats.has(id)) {
      notifiedChats.add(id);
      chrome.runtime.sendMessage({
        type: 'NEW_MESSAGE',
        sender,
        status: currentStatus
      });
      console.log('[TeamsNotifier] Notifica inviata:', sender);
    }
  });
}

// ────────────────────────────────────────────────────────────
//  GESTIONE TOGGLE ON/OFF DA POPUP
// ────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled'], (result) => {
  extensionEnabled = result.enabled !== false; // default: on
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    extensionEnabled = changes.enabled.newValue;
    console.log('[TeamsNotifier] Estensione', extensionEnabled ? 'ATTIVA' : 'DISATTIVATA');
  }
});

// ────────────────────────────────────────────────────────────
//  AVVIO
// ────────────────────────────────────────────────────────────

const waitForTeams = setInterval(() => {
  if (document.querySelector(SELECTORS.myAvatarTrigger)) {
    clearInterval(waitForTeams);
    console.log('[TeamsNotifier] Teams caricato, avvio monitoraggio');
    tick(); // primo giro (registra lo stato senza notificare)
    setInterval(tick, 2000); // controllo ogni 2 secondi
  }
}, 2000);
