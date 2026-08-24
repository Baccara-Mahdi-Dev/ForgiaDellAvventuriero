# Provenienza dei dati

L'interfaccia contiene nomi e meccaniche strutturate compatibili con le regole 5e 2014. Le descrizioni, inclusi gli effetti dei tratti razziali e delle magie concesse, sono riassunti originali e non riproduzioni dei manuali PHB, XGE o TCE. I record WGE sono identificati separatamente.

Il catalogo `equipment.json` deriva dalle tabelle di armature, armi, equipaggiamento d'avventura e strumenti del _System Reference Document 5.1_, Copyright 2016 Wizards of the Coast, Inc. I nomi sono localizzati per questa applicazione e tutte le misure sono convertite in metri e chilogrammi. Fonte ufficiale: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf.

Il catalogo aggiuntivo `magic-equipment.json` contiene 244 oggetti magici, famiglie e varianti ricavati dal _System Reference Document 5.1_ ufficiale in italiano. I record conservano nomi, descrizioni, rarità, sintonia e fonte; alcune meccaniche sono state normalizzate in effetti strutturati per i calcoli dell'app. Fonte: https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf.

Questo materiale del _System Reference Document 5.1_ di Wizards of the Coast LLC è disponibile secondo la licenza [Creative Commons Attribuzione 4.0 Internazionale](https://creativecommons.org/licenses/by/4.0/legalcode.it). La pagina ufficiale di riferimento è https://dnd.wizards.com/it/resources/systems-reference-document.

Il catalogo `spells.json` è generato dalle liste per classe e dalle schede degli incantesimi dello stesso _System Reference Document 5.1_. Il testo è mantenuto in inglese; distanze, aree, pesi e volumi imperiali sono convertiti in unità metriche. Lo script riproducibile è `scripts/import-srd-spells.py`.

L'icona `gameDiceTwentyFacesTwenty` proviene da Game Icons tramite `@ng-icons/game-icons` ed è distribuita con licenza CC BY 3.0. Fonti: https://game-icons.net/ e https://github.com/ng-icons/ng-icons.

## Modello della scheda del personaggio

L'esportazione della scheda PDF usa la scheda del personaggio italiana compilabile fornita come modello locale in `public/pdf/scheda-personaggio.pdf`, copyright Wizards of the Coast LLC. Il documento stesso ne consente la copia per uso personale. L'applicazione valorizza esclusivamente i campi del modulo con i dati inseriti dall'utente.

L'esportazione delle carte incantesimo genera invece un nuovo documento dall'impaginazione originale del progetto. Include soltanto i dati e le magie già presenti nel personaggio e non incorpora il modello della scheda ufficiale.
