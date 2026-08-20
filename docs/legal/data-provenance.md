# Provenienza dei dati

L'interfaccia contiene nomi e meccaniche strutturate compatibili con le regole 5e 2014. Le descrizioni, inclusi gli effetti dei tratti razziali e delle magie concesse, sono riassunti originali e non riproduzioni dei manuali PHB, XGE o TCE. I record WGE sono identificati separatamente.

Il catalogo `equipment.json` deriva dalle tabelle di armature, armi, equipaggiamento d'avventura e strumenti del _System Reference Document 5.1_, Copyright 2016 Wizards of the Coast, Inc. I nomi sono localizzati per questa applicazione e tutte le misure sono convertite in metri e chilogrammi. Fonte ufficiale: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf.

Il catalogo `spells.json` è generato dalle liste per classe e dalle schede degli incantesimi dello stesso _System Reference Document 5.1_. Il testo è mantenuto in inglese; distanze, aree, pesi e volumi imperiali sono convertiti in unità metriche. Lo script riproducibile è `scripts/import-srd-spells.py`.

L'icona `gameDiceTwentyFacesTwenty` proviene da Game Icons tramite `@ng-icons/game-icons` ed è distribuita con licenza CC BY 3.0. Fonti: https://game-icons.net/ e https://github.com/ng-icons/ng-icons.

## Modello della scheda del personaggio

L'esportazione PDF usa la scheda del personaggio italiana compilabile fornita come modello locale in `public/pdf/scheda-personaggio.pdf`, copyright Wizards of the Coast LLC. Il documento stesso ne consente la copia per uso personale. L'applicazione valorizza esclusivamente i campi del modulo con i dati inseriti dall'utente.
