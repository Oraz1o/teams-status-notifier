# 📡 Teams Status Notifier

> Estensione Chrome che ti notifica sul telefono quando arrivano messaggi su Microsoft Teams (PWA), **solo se non sei nello stato Disponibile**.

![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-3.0.0-orange)

Pensata per chi usa Teams sul PC ma **non può/non vuole averlo sul telefono**, e ha bisogno di sapere quando un collega lo cerca mentre è lontano dalla scrivania.

---

## ✨ Caratteristiche

- 🔔 Notifiche push sul telefono quando arrivano messaggi su Teams
- 🚦 Si attiva **solo** quando il tuo stato non è "Disponibile" (Occupato, Assente, Non disturbare, ecc.)
- 👤 Mostra il **nome del mittente**
- 🔁 Una sola notifica per chat finché non leggi i messaggi
- 🎚️ Toggle on/off rapido senza ricaricare l'estensione
- 🌐 Due provider intercambiabili:
  - **✈️ Telegram** — gratis, ma può essere bloccato dai proxy aziendali
  - **🔔 Pushover** — $4.99 una tantum, passa quasi sempre dai proxy aziendali

---

## 📦 Installazione

1. Scarica l'ultima versione dalla pagina [Releases](../../releases) (oppure clona il repo)
2. Estrai lo zip
3. Apri Chrome e vai su `chrome://extensions`
4. Abilita la **Modalità sviluppatore** (toggle in alto a destra)
5. Clicca **Carica estensione non pacchettizzata**
6. Seleziona la cartella estratta

> 💡 L'estensione funziona **anche con Teams installato come PWA**, non solo nella scheda del browser.

---

## ⚙️ Configurazione

### Opzione A — Telegram (gratis)

1. Su Telegram, scrivi a [@BotFather](https://t.me/BotFather) e manda `/newbot`
2. Segui le istruzioni e copia il **Bot Token**
3. Cerca il tuo bot e mandagli un messaggio (es. `ciao`)
4. Apri nel browser: `https://api.telegram.org/botTOKEN/getUpdates`
5. Trova `"chat":{"id":NUMERO}` → quello è il tuo **Chat ID**
6. Click sull'icona dell'estensione 📡, tab **Telegram**, incolla i due valori
7. **Salva** → **Test**

### Opzione B — Pushover (a pagamento, per ambienti con proxy)

1. Crea un account gratis su [pushover.net](https://pushover.net)
2. Annota lo **User Key** dalla dashboard
3. Installa l'app **Pushover** sul telefono e fai login
4. Crea un'app su [pushover.net/apps/build](https://pushover.net/apps/build):
   - Name: `Teams Notifier`
   - Type: Application
5. Copia l'**API Token/Key**
6. Click sull'icona dell'estensione 📡, tab **Pushover**, incolla i due valori
7. **Salva** → **Test**

> 💰 Pushover offre 30 giorni di trial gratuito, dopodiché serve una licenza una tantum di **$4.99 per piattaforma** (Android, iOS o Desktop). L'API è gratuita fino a 10.000 messaggi/mese.

---

## 🔄 Cambiare provider

Cliccando una **tab** nella popup:
- Vedi i campi di quel provider per modificarli
- Quel provider diventa **automaticamente quello attivo** per le notifiche

In basso vedi sempre indicato qual è il provider attualmente in uso.

---

## 🔐 Privacy

- Tutte le credenziali sono salvate **solo** in `chrome.storage.local` (mai sincronizzate online)
- Solo il **nome del mittente** lascia il browser, **mai il contenuto** del messaggio
- Le richieste vanno direttamente a `api.telegram.org` o `api.pushover.net`, senza passare da server intermedi

---

## 🛠️ Come funziona internamente

L'estensione inietta un **content script** nella PWA di Teams che:
1. Osserva il DOM ogni 2 secondi cercando l'indicatore di stato (`data-tid="me-control-avatar-presence"`)
2. Scansiona la lista chat per trovare quelle con il titolo in grassetto (= messaggi non letti) controllando il `font-weight` calcolato
3. Se rileva una nuova chat non letta E lo stato non è "Disponibile/Available", invia la notifica al provider attivo

L'approccio basato su `getComputedStyle` rende l'estensione robusta agli aggiornamenti di Teams: anche se Microsoft cambia le classi CSS, finché le chat non lette restano visivamente in grassetto, il codice continua a funzionare.

---

## 🐛 Troubleshooting

### Non ricevo notifiche
1. Apri Teams → `F12` → tab **Console**
2. Cerca log che iniziano con `[TeamsNotifier]`
3. Devi vedere `[TeamsNotifier] Avvio: stato = ...`
4. Cambia stato in "Occupato"/"Assente"/etc., fatti scrivere e aspetta ~2 secondi
5. Se non vedi `Notifica inviata: ...`, il rilevamento del DOM non funziona — apri una [issue](../../issues)

### Il proxy aziendale blocca tutto
- Prova prima Telegram: se è bloccato, switcha su Pushover
- Verifica con `curl -I https://api.pushover.net/1/messages.json` da terminale

### Le notifiche arrivano duplicate
Verifica di non avere l'estensione caricata due volte in `chrome://extensions`.

---

## 🗺️ Roadmap

- [x] v1.0 — Notifiche con nome mittente via Telegram
- [x] v2.0 — Supporto Pushover per ambienti con proxy
- [x] v3.0 — Selettore provider con tab
- [ ] v4.0 — **Contenuto del messaggio** nelle notifiche
- [ ] v5.0 — Filtro per mittenti (silenzia certi colleghi)
- [ ] v6.0 — Pubblicazione su Chrome Web Store

---

## 🤝 Contribuire

Pull request benvenute! Per modifiche significative, apri prima una issue per discuterne.

## 📄 Licenza

MIT — vedi [LICENSE](LICENSE)
