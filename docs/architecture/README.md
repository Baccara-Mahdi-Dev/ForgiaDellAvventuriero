# Architettura e componenti

## Panoramica del flusso

```text
manifest.json
    │
    ▼
CatalogService ── carica in parallelo i sei cataloghi JSON
    │
    ▼
WizardStore ── conserva CharacterDraft e calcola DerivedCharacter
    │               │
    │               └─ rules.ts: regole pure e deterministiche
    ▼
HomeComponent / WizardComponent
    │
    ├─ IndexedDB (principale)
    ├─ localStorage (fallback)
    └─ export/import JSON
```

L'inizializzatore dell'app attende il caricamento del catalogo prima di creare le pagine. Di conseguenza i componenti possono usare `CatalogService.requireData()` senza gestire uno stato parzialmente caricato.

## Bootstrap e configurazione

### `src/main.ts`

È il punto di ingresso del browser. Avvia il componente radice usando la configurazione definita in `app.config.ts`.

### `src/app/app.config.ts`

Registra i provider globali:

- client HTTP per caricare i JSON;
- router Angular;
- Taiga UI;
- `CatalogService.load()` come inizializzatore bloccante;
- service worker soltanto nelle build non di sviluppo.

La strategia `registerWhenStable:30000` registra il service worker quando l'app diventa stabile, con un limite massimo di 30 secondi.

### `src/app/app.ts`, `app.html` e `app.scss`

Costituiscono il guscio dell'applicazione. Il template ospita il router e gli elementi globali; lo stile locale riguarda soltanto questo guscio.

### `src/app/app.routes.ts`

Definisce due pagine lazy-loaded:

| Percorso          | Componente        | Scopo                                                                   |
| ----------------- | ----------------- | ----------------------------------------------------------------------- |
| `/`               | `HomeComponent`   | Elenco, creazione, apertura, eliminazione e importazione dei personaggi |
| `/crea/:id/:step` | `WizardComponent` | Modifica di un personaggio nello step indicato                          |

Qualunque percorso sconosciuto torna alla home. `:id` è l'UUID della bozza; `:step` deve corrispondere a un valore di `StepId`.

## Livello core

### `CatalogService`

File: `src/app/core/catalog.service.ts`.

Responsabilità:

1. caricare `data/v1/manifest.json`;
2. verificare versione dello schema e campi essenziali;
3. caricare in parallelo razze, classi, background, talenti, incantesimi ed equipaggiamento;
4. controllare conteggi, ID mancanti e duplicati;
5. esporre il catalogo tramite un Signal di sola lettura.

`data()` può essere nullo durante il bootstrap. `requireData()` restituisce il catalogo oppure segnala un errore: va usato soltanto dopo l'inizializzatore dell'app.

La validazione nel browser è intenzionalmente rapida. I controlli semantici più profondi sono responsabilità di `scripts/validate-data.mjs`.

### `CharacterDatabase`

File: `src/app/core/character.database.ts`.

È un database Dexie chiamato `ForgiaAvventurieroDB`, con tabella `characters` e chiave primaria `id`.

- versione 1: indici `id`, `updatedAt`, `revision`;
- versione 2: aggiunge l'indice `name` senza eliminare i dati esistenti.

Quando si cambia la forma persistita in modo incompatibile bisogna aggiungere una nuova versione Dexie e una migrazione. Aggiungere campi opzionali, invece, è normalmente gestito da `WizardStore.normalize()`.

### `ThemeService`

File: `src/app/core/theme.service.ts`.

Determina il tema con questa priorità:

1. preferenza esplicita salvata in `localStorage` sotto `forgia-color-theme`;
2. preferenza di sistema `prefers-color-scheme`;
3. tema chiaro se il browser non fornisce una preferenza.

Il tema viene applicato a `document.documentElement.dataset.theme`, a `color-scheme` e al meta `theme-color`. I colori veri e propri sono definiti nei token SCSS, quindi una nuova variante cromatica non va implementata nel servizio.

## Dominio

### `models.ts`

File: `src/app/domain/models.ts`.

È il contratto TypeScript centrale. Contiene:

- tipi condivisi come `AbilityKey`, `Alignment`, `ArmorType` e `EquipmentCategory`;
- interfacce dei sei cataloghi;
- `CharacterDraft`, cioè ciò che viene salvato;
- `DerivedCharacter`, cioè ciò che viene calcolato;
- definizioni statiche di caratteristiche, abilità, allineamenti e step.

Quando si aggiunge un campo JSON che deve essere usato dall'app, il modello va aggiornato prima del servizio o dell'interfaccia. I campi facoltativi vanno marcati con `?` e devono avere un comportamento predefinito in assenza del dato.

### `catalog.ts`

File: `src/app/domain/catalog.ts`.

Descrive il manifest, i nomi dei file e l'aggregato `CatalogData`. `RulesCatalog` è una vista ridotta usata dal motore: include soltanto i cataloghi necessari ai calcoli sincroni.

### `rules.ts`

File: `src/app/domain/rules.ts`.

Contiene funzioni pure: a parità di bozza e catalogo producono sempre lo stesso risultato e non accedono al browser. Le aree principali sono:

| Funzione                | Responsabilità                                     |
| ----------------------- | -------------------------------------------------- |
| `pointBuyCost`          | costo cumulativo di un punteggio nel point buy     |
| `modifier`              | modificatore di caratteristica                     |
| `proficiency`           | bonus di competenza per livello                    |
| `maximumSpellLevel`     | livello massimo degli incantesimi per classe       |
| `spellSlots`            | slot standard, del Patto e Arcanum                 |
| `experienceForLevel`    | PE iniziali del livello                            |
| `asiSlots`              | numero di scelte ASI/talento ottenute dalla classe |
| `featEffectTotals`      | aggregazione degli effetti numerici dei talenti    |
| `growthChoicesComplete` | validità complessiva di ASI, talenti e limite 20   |
| `maximumHp`             | PF con media, tiri o valore manuale                |
| `classResources`        | risorse distintive scalate per classe e livello    |
| `derive`                | costruzione completa di `DerivedCharacter`         |
| `featEligible`          | controllo dei prerequisiti di un talento           |

Le nuove regole numeriche devono stare qui, non nel template. Questo mantiene i calcoli testabili senza avviare Angular.

## Stato applicativo

### `WizardStore`

File: `src/app/state/wizard.store.ts`.

È il punto centrale dello stato del personaggio.

- `draft`: Signal scrivibile con le scelte dell'utente;
- `derived`: Signal calcolato tramite `derive()`;
- `pointsSpent`: costo corrente del point buy;
- `selectedAncestry`, `selectedClass`, `selectedBackground`: record risolti dagli ID;
- `availableSpells`: incantesimi della classe entro il livello consentito, esclusi quelli concessi gratuitamente;
- `fixedGrantedSpellIds`: incantesimi fissi da razza, talento o sottoclasse;
- `activeGrantedSpellChoiceIds`: incantesimi scelti tramite concessioni configurabili;
- `saveState`: stato visibile dell'autosalvataggio.

Ogni `patch()` incrementa `revision`, aggiorna `updatedAt` e registra la versione corrente del catalogo. Un effect attende 350 ms dall'ultima modifica e poi salva la bozza.

La persistenza prova prima IndexedDB. Se l'operazione fallisce usa chiavi `forgia:<id>` in `localStorage`. `normalize()` completa i campi opzionali mancanti, rendendo leggibili i vecchi salvataggi.

Importare un personaggio genera un nuovo UUID per non sovrascrivere l'originale. L'esportazione contiene soltanto `CharacterDraft`: tutti i valori derivati saranno ricalcolati all'apertura.

## Componenti dell'interfaccia

### `HomeComponent`

File: `src/app/features/home/`.

Carica l'elenco ordinato per ultimo aggiornamento e permette di:

- creare una nuova bozza;
- aprire un personaggio esistente;
- eliminare una bozza dopo conferma;
- importare un file JSON.

Non calcola regole di gioco: delega tutto al `WizardStore`.

### `WizardComponent`

File: `src/app/features/wizard/`.

È il coordinatore dei dieci step. Il file TypeScript gestisce filtri, selezioni, vincoli di avanzamento e formattazione; il template rende le sezioni; lo SCSS controlla layout responsive, sidebar e temi.

Le responsabilità principali sono:

- sincronizzare route, ID e step attivo;
- impedire l'avanzamento finché lo step non è completo;
- resettare le scelte dipendenti quando cambia razza o classe;
- gestire scelte razziali, competenze, ASI, talenti e PF;
- filtrare incantesimi ed equipaggiamento;
- calcolare attacco e danno delle armi per la presentazione;
- gestire zaino, quantità e monete;
- importare, esportare e stampare la scheda.

`stepComplete()` è il controllo di navigazione. Se si introduce un nuovo requisito obbligatorio, va aggiunto lì e deve essere coerente con i dati iniziali creati dallo store.

### `ThemeToggleComponent`

File: `src/app/shared/theme-toggle/`.

È un controllo presentazionale che legge e commuta `ThemeService`. Non contiene colori né persistenza propria.

## Stili e icone

- `src/styles/_tokens.scss`: variabili cromatiche e token per tema chiaro/scuro;
- `src/styles.scss`: regole globali e import dei token;
- SCSS dei componenti: layout e dettagli locali;
- `@ng-icons/game-icons`: icone dei dadi e delle caratteristiche.

Le icone dinamiche devono essere importate nel componente e mappate esplicitamente. Una stringa costruita a runtime non registra automaticamente un'icona nel bundle.

## PWA e cache offline

`ngsw-config.json` divide le risorse in tre gruppi:

- `app`: HTML, CSS, JavaScript e file essenziali precaricati;
- `catalog`: tutti i JSON sotto `/data`, precaricati e aggiornati insieme;
- `assets`: immagini e font caricati quando servono.

Quando si pubblica una nuova versione dei cataloghi è necessario produrre una nuova build: il service worker userà gli hash generati per distribuire l'aggiornamento.
