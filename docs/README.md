# Manuale tecnico di Forgia dell'avventuriero

Questa cartella documenta l'applicazione dal punto di vista di chi deve mantenerla o ampliarla. Il progetto è una PWA Angular senza backend: i cataloghi di gioco sono file JSON statici, mentre i personaggi vengono salvati nel browser.

## Percorso di lettura consigliato

1. [Architettura e componenti](architecture/README.md) — avvio dell'app, routing, servizi, store, motore delle regole, componenti UI, tema e PWA.
2. [Cataloghi JSON](data/README.md) — manifest e struttura completa di razze, classi, background, talenti, incantesimi ed equipaggiamento.
3. [Regole e funzionalità](features/README.md) — flusso del wizard, ASI/talenti, magia, PF, CA, abilità, risorse di classe e statistiche homebrew.
4. [Sviluppo, test e pubblicazione](development/README.md) — procedure sicure per aggiungere dati o funzionalità, validazione, test, build, editor locale e Netlify.
5. [Dizionario dati sintetico](data-dictionary.md) — promemoria rapido dei campi della bozza personaggio.

## Mappa rapida del repository

```text
ForgiaAvventuriero/
├─ public/data/v1/       Cataloghi JSON caricati dalla PWA
├─ scripts/              Importazione, aggiornamento e validazione dati
├─ src/app/core/         Catalogo, IndexedDB e tema
├─ src/app/domain/       Tipi TypeScript e regole pure
├─ src/app/features/     Home e wizard di creazione
├─ src/app/shared/       Componenti riutilizzabili
├─ src/app/state/        Stato reattivo e persistenza del personaggio
├─ tools/catalog-editor/ Editor locale dei JSON
├─ docs/                 Documentazione e decisioni architetturali
├─ ngsw-config.json      Cache offline della PWA
└─ netlify.toml          Build, routing SPA e intestazioni di sicurezza
```

## Principi del progetto

- **Dati separati dall'interfaccia:** le opzioni di gioco vivono in `public/data/v1`, non nei componenti Angular.
- **Bozza separata dai valori calcolati:** `CharacterDraft` contiene le scelte dell'utente; `DerivedCharacter` viene rigenerato dal motore delle regole.
- **ID stabili:** i collegamenti tra file usano ID tecnici non localizzati, per esempio `half-elf`, `wizard` o `minor-illusion`.
- **Funzionamento offline:** applicazione, cataloghi e risorse sono memorizzati dal service worker.
- **Nessun backend necessario:** IndexedDB è il deposito principale; `localStorage` è il ripiego.
- **Contenuti tracciabili:** ogni record dichiara una fonte e le note legali sono in [data-provenance.md](legal/data-provenance.md).

## Comandi essenziali

```powershell
npm install
npm start
npm run validate:data
npm run test:ci
npm run build
npm run verify
```

`npm run verify` è il controllo completo da eseguire prima di integrare una modifica: convalida i JSON, esegue i test e produce la build di produzione.
