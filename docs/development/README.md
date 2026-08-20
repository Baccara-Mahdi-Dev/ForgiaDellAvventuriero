# Sviluppo, test e pubblicazione

## Requisiti e avvio

- Node.js 22, coerente con Netlify;
- npm;
- browser moderno con IndexedDB e service worker.

```powershell
npm install
npm start
```

L'app di sviluppo è disponibile su `http://localhost:4200`. Il service worker è disabilitato in modalità sviluppo, quindi le modifiche appaiono senza interferenze della cache offline.

## Controlli disponibili

| Comando                  | Scopo                                  |
| ------------------------ | -------------------------------------- |
| `npm run validate:data`  | valida manifest e cataloghi JSON       |
| `npm run test:ci`        | esegue i test una sola volta           |
| `npm run build`          | produce la build Angular di produzione |
| `npm run verify`         | validazione dati, test e build         |
| `npm run catalog:editor` | avvia l'editor JSON locale             |
| `npm run build:netlify`  | controlli, build e metadati pubblici   |

Usare `npm run verify` prima di consegnare o pubblicare una modifica.

## Procedura per aggiungere dati

1. Identificare il catalogo e leggere il relativo schema in [Cataloghi JSON](../data/README.md).
2. Scegliere un ID stabile in kebab-case.
3. Verificare tutti gli ID referenziati: classi, abilità, incantesimi, equipaggiamento o razze.
4. Aggiungere il record manualmente o tramite Forgia Data Studio.
5. Incrementare `manifest.dataVersion`.
6. Aggiornare il conteggio nel manifest; l'editor lo fa automaticamente.
7. Eseguire `npm run validate:data`.
8. Aggiungere test quando il record introduce un comportamento numerico o una nuova combinazione.
9. Eseguire `npm run verify`.

Non modificare gli ID esistenti senza una migrazione dei `CharacterDraft` salvati. Rinominare `name` è invece sicuro.

## Forgia Data Studio

```powershell
npm run catalog:editor
```

Aprire `http://127.0.0.1:4310`. Il server ascolta soltanto sull'interfaccia locale e consente ricerca, modifica, duplicazione, eliminazione, validazione e backup.

Prima di ogni salvataggio crea una copia in `tools/catalog-editor/backups`. Un file JSON completamente nuovo deve essere registrato manualmente nel manifest e nel codice TypeScript.

La guida specifica è in `tools/catalog-editor/README.md`.

## Script dati

### `scripts/validate-data.mjs`

È il controllo principale e deve evolvere insieme agli schemi. Quando si introduce un nuovo campo strutturato, aggiungere qui i controlli per tipo, dominio e riferimenti.

### `scripts/import-srd-spells.py`

Importa e normalizza gli incantesimi SRD. Prima di rieseguirlo controllare input, conversioni metriche e comportamento sulle integrazioni manuali: un'importazione completa può sostituire dati già arricchiti.

### `scripts/update-artificer-spells.mjs`

Integra lista e concessioni di sottoclasse dell'Artefice. È preferibile modificare questo script e rigenerare il catalogo, anziché applicare correzioni non ripetibili direttamente al JSON.

### `scripts/update-phb-ancestries.mjs`

Rigenera le opzioni razziali PHB e preserva i record non PHB esistenti. Contiene le strutture condivise per Nani, Elfi, Halfling e Dragonidi.

### `scripts/generate-public-metadata.mjs`

Dopo la build genera `robots.txt`, `sitemap.xml` e `.well-known/security.txt`. Usa `URL`, `SITE_URL` o `DEPLOY_PRIME_URL` per determinare l'origine pubblica.

### `scripts/generate-brand-icons.py`

Genera favicon e tutte le dimensioni PWA dal master trasparente `public/brand/logo-d20-hammer.png`:

```bash
npm run brand:icons
```

Richiede Python con Pillow. Il master non viene modificato.

## Aggiungere un nuovo effetto di talento

Esempio: un bonus numerico alla velocità.

1. In `FeatEffects` aggiungere `speedBonusMeters?: number`.
2. Nel JSON del talento impostare `"speedBonusMeters": 3`.
3. In `featEffectTotals()` inizializzare, sommare e restituire il campo.
4. In `derive()` aggiungerlo a `speedMeters`.
5. Nel validatore richiedere un numero finito e non negativo.
6. Nel riepilogo mostrare la velocità già derivata; aggiungere una nota se serve spiegare la fonte.
7. In `rules.spec.ts` verificare talento singolo, più talenti e interazione con la razza.

Questa sequenza evita il caso in cui il JSON descrive un effetto che l'app non applica.

## Aggiungere una nuova classe

Oltre al record in `classes.json`, controllare:

- `maximumSpellLevel()` e `spellSlots()` se usa magia;
- `asiSlots()` se ha una progressione speciale;
- `CLASS_ABILITY_PRIORITIES` per il consiglio del d20;
- `classResources()` per risorse scalabili;
- `derive()` per competenze o armature eccezionali;
- `spells.json` per la lista della classe;
- test ai livelli 1, soglie di sottoclasse, ASI e slot.

## Aggiungere un nuovo tipo di catalogo

È una modifica trasversale:

1. creare l'interfaccia in `models.ts`;
2. aggiungere la proprietà a `CatalogFiles` e `CatalogData`;
3. registrare file e conteggio in `manifest.json`;
4. caricarlo in `CatalogService.load()`;
5. aggiungere validazione e gestione nell'editor;
6. esporlo dallo store o da un servizio specifico;
7. configurare UI, test e documentazione.

## Test

I test principali sono:

- `src/app/domain/rules.spec.ts`: calcoli puri e casi di regola;
- `src/app/app.spec.ts`: bootstrap e struttura base dell'app.

Per le regole usare fixture minime e asserzioni sui livelli di confine. Per esempio, una risorsa che cambia al 6° livello deve essere verificata almeno al 5° e al 6°.

Categorie di test consigliate per ogni nuova funzionalità:

- caso normale;
- valore minimo e massimo;
- campo opzionale assente;
- combinazione con razza, classe o talento;
- importazione di una vecchia bozza, quando cambia `CharacterDraft`.

## Persistenza e migrazioni

### Campo opzionale compatibile

1. aggiungere il campo opzionale a `CharacterDraft`;
2. impostarlo in `fresh()`;
3. completarlo in `normalize()`;
4. aggiungere un test o verificare import di una bozza priva del campo.

### Modifica incompatibile

Se un campo cambia significato o formato:

1. incrementare `CharacterDraft.schemaVersion` soltanto con una strategia di importazione;
2. aggiungere una versione a Dexie;
3. migrare i record esistenti;
4. supportare o rifiutare esplicitamente i vecchi JSON esportati;
5. documentare la rottura.

Non usare `catalogVersion` come versione dello schema del personaggio: indica soltanto con quali dati è stata aggiornata l'ultima volta la bozza.

## Stili e accessibilità

- usare i token in `_tokens.scss`, senza colori isolati nei componenti;
- controllare tema chiaro e scuro;
- preservare focus visibile, etichette e stato `disabled`;
- verificare layout mobile e sidebar desktop;
- per nuove icone fornire sempre testo o `aria-label`;
- mantenere animazioni brevi e rispettare `prefers-reduced-motion` se diventano sostanziali.

## Build e Netlify

`netlify.toml` pubblica soltanto `dist/ForgiaAvventuriero/browser` e usa `npm run build:netlify`. Poiché quel comando esegue prima i controlli, una validazione o un test fallito impedisce la build.

Il redirect `/* -> /index.html` permette al router SPA di aprire direttamente URL come `/crea/<id>/razza`. Le intestazioni configurano CSP, protezione dal framing, policy dei permessi e cache differenziata.

Gli asset con hash possono essere memorizzati a lungo; `index.html`, service worker e cataloghi devono essere rivalidati per ricevere gli aggiornamenti.

## Checklist prima di pubblicare

- [ ] `manifest.dataVersion` è coerente con le modifiche dati.
- [ ] Provenienza e licenza dei nuovi contenuti sono documentate.
- [ ] Nessun ID esistente è stato cambiato accidentalmente.
- [ ] `npm run verify` termina senza errori.
- [ ] Tema chiaro e scuro sono leggibili.
- [ ] Il wizard funziona almeno su viewport desktop e mobile.
- [ ] Importazione, autosalvataggio ed esportazione JSON restano operativi.
- [ ] La build contiene `manifest.webmanifest`, dati e metadati pubblici.

## Decisioni e note legali

Le decisioni architetturali sono in `docs/adr`. Provenienza e limiti d'uso dei dati sono in `docs/legal`, `OPEN_GAME_LICENSE.md` e `THIRD_PARTY_NOTICES.md`. Qualunque nuovo dataset deve essere accompagnato dalla relativa provenienza prima della pubblicazione.
