# Forgia Data Studio

Editor locale per i cataloghi JSON in `public/data/v1`.

## Avvio

```bash
npm run catalog:editor
```

Aprire `http://127.0.0.1:4310` nel browser. Il server ascolta esclusivamente sull'interfaccia locale.

## Funzioni

- modifica, aggiunta, duplicazione ed eliminazione dei record;
- modifica del JSON completo, inclusa la struttura principale;
- ricerca per nome o ID;
- aggiornamento automatico dei conteggi nel manifest per i cataloghi già registrati;
- validazione tramite lo script ufficiale del progetto;
- backup automatici in `tools/catalog-editor/backups` prima di ogni salvataggio.

I nuovi file JSON non vengono aggiunti automaticamente alla mappa `files` del manifest: questa scelta resta esplicita e può essere effettuata aprendo `manifest.json` nell'editor.
