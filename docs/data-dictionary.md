# Dizionario dati

- `CharacterDraft`: bozza persistita, versione schema 1 e ID opaco.
- `abilities`: punteggi base; bonus di discendenza e ASI restano separati.
- `ancestryId`, `classId`, `backgroundId`: riferimenti stabili non localizzati.
- `ancestryBonusAbilities`, `ancestrySkillProficiencies`, `ancestryToolProficiencies`: scelte variabili richieste dalla razza.
- `subclassId`: etichetta scelta; è richiesta dal livello di ingresso della classe.
- `featIds`, `spellIds`: talenti e incantesimi scelti dalla normale lista di classe.
- `homebrewSpells`: incantesimi personali completi; il campo `concentration` viene mantenuto nella durata normalizzata.
- `grantedSpellChoices`: magie scelte tramite razza o talento, separate dai limiti della classe.
- `spellGrantTraditions`: tradizione magica scelta per capacità come Iniziato alla Magia.
- `featAbilityChoices`: caratteristica scelta per gli aumenti concessi dai talenti.
- `effects`, `requirements`: effetti numerici e prerequisiti dei talenti applicati dal motore.
- `currentHp`, `temporaryHp`, `hitDiceSpent`, `deathSaveSuccesses`, `deathSaveFailures`: stato di gioco modificabile nella scheda.
- `personalityTraits`, `ideals`, `bonds`, `flaws`: dettagli narrativi del personaggio.
- `traitDetails`: nome ed effetto completo delle capacità razziali mostrate nel riepilogo.
- `spellGrants`, `spellChoices`: magie fisse e scelte magiche concesse da razze e talenti.
- `spells.json`: 348 incantesimi con testo prevalentemente inglese, classi autorizzate, livello, scuola, lancio, gittata, componenti, durata, concentrazione, tiri, danni e concessioni di sottoclasse.
- `homebrewEquipment`: oggetti personali salvati come `EquipmentItem` e uniti al catalogo dallo store.
- `equippedArmorId`, `equippedShieldId`, `shieldEquipped`: protezioni usate per calcolare la CA.
- `equippedWeapons`, `equippedItemIds`: armi impugnate e altri oggetti attualmente equipaggiati.
- `attunedEquipmentIds`: massimo tre oggetti con sintonia attiva.
- `equipmentCharges`: cariche correnti indicizzate per ID dell'oggetto.
- `inventory`: righe dello zaino, composte da ID del catalogo e quantità.
- `coins`: monete di rame, argento, electrum, oro e platino.
- `equipment.json`: 166 armature, armi, strumenti da artigiano e oggetti SRD; pesi in kg e distanze in m.
- `magic-equipment.json`: 249 oggetti magici e varianti SRD in italiano, uniti al catalogo base tramite `manifest.additionalEquipment`.
- `EquipmentItem.magical`, `rarity`, `requiresAttunement`: natura magica, rarità e requisito di sintonia.
- `EquipmentItem.effects`, `spellGrants`, `charges`: effetti attivi/passivi, incantesimi concessi e risorse consumabili.
- `revision`, `updatedAt`: controllo e ordinamento dell'autosalvataggio.

Il database `ForgiaAvventurieroDB` contiene lo store `characters`; la versione 2 aggiunge l'indice sul nome senza cancellare i dati precedenti.

Per descrizioni ed esempi completi consultare [Cataloghi JSON](data/README.md) e [Regole e funzionalità](features/README.md).
