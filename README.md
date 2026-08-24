# Forgia dell'avventuriero

PWA offline per creare personaggi monoclasse compatibili con D&D 5e 2014. Il progetto usa Angular 21 standalone e zoneless, Taiga UI, Tailwind CSS, Signals, RxJS e Dexie/IndexedDB.

## Avvio

```powershell
npm install
npm start
```

Aprire `http://localhost:4200`. Per controllare dati, test e build di produzione:

```powershell
npm run verify
```

## Funzioni

- wizard in dieci passi, responsive e utilizzabile da tastiera;
- point buy, array standard e punteggi personalizzati;
- discendenze PHB e varianti Forgiato WGE;
- tutte le classi PHB e Artefice TCE;
- livelli 1–20, sottoclassi, talenti/ASI e 244 oggetti magici SRD in italiano;
- calcolo di modificatori, competenza, PF, CA, iniziativa e magia;
- editor Homebrew per incantesimi ed equipaggiamento, con concentrazione, effetti, cariche e sintonia;
- selezione di incantesimi con limiti per classe, ricerca, filtri e pagine da quattro risultati;
- catalogo equipaggiamento paginato e ordinabile, con rarità e sintonia per gli oggetti magici;
- autosalvataggio IndexedDB con fallback localStorage;
- import/export JSON, scheda PDF compilabile e carte incantesimo ordinate per livello e nome;
- service worker e manifest installabile.

## Documentazione tecnica

Il manuale per manutenzione ed estensioni parte da [docs/README.md](docs/README.md). Include architettura, responsabilità di ogni componente, schemi completi dei cataloghi JSON, implementazione di ASI e talenti, incantesimi, equipaggiamento, persistenza, test e pubblicazione.

I testi di gioco sono riassunti originali e non sostituiscono i manuali. Consultare `docs/legal/data-provenance.md`.

## Deploy Netlify

Il file `netlify.toml` pubblica esclusivamente la PWA da `dist/ForgiaAvventuriero/browser`.
Validazione e test vengono eseguiti prima della build: se falliscono, la build non parte.

```powershell
npm run build:netlify
```

## Contributi e licenze

Prima di contribuire leggere [CONTRIBUTING.md](CONTRIBUTING.md). Il codice originale è distribuito con licenza MIT; i dati SRD e gli altri contenuti di terzi mantengono le licenze indicate in [OPEN_GAME_LICENSE.md](OPEN_GAME_LICENSE.md) e [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
