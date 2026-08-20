# Cataloghi JSON

I dati di gioco risiedono in `public/data/v1`. Sono file statici inclusi nella build e memorizzati offline dal service worker. Non vengono copiati in IndexedDB: IndexedDB conserva soltanto i personaggi.

## Regole comuni

Ogni record usa almeno questi campi:

```json
{
  "id": "stable-kebab-case-id",
  "name": "Nome mostrato",
  "description": "Riassunto originale",
  "source": "PHB"
}
```

- `id` deve essere unico nel proprio catalogo, stabile e non tradotto;
- `name` può essere localizzato senza rompere i salvataggi;
- `description` è mostrata nelle card e deve essere concisa;
- `source` deve comparire in `manifest.sources`;
- distanze e velocità sono in metri, pesi in chilogrammi;
- i riferimenti tra cataloghi usano sempre gli ID, mai i nomi.

Le caratteristiche ammesse sono `str`, `dex`, `con`, `int`, `wis`, `cha`. Le abilità usano gli ID definiti nell'array `SKILLS` di `models.ts`.

## `manifest.json`

Il manifest è il punto di ingresso del catalogo.

```json
{
  "schemaVersion": 1,
  "dataVersion": "1.9.0",
  "locale": "it",
  "ruleset": "5e-2014",
  "catalog": {
    "ancestries": 27,
    "classes": 13,
    "backgrounds": 6,
    "feats": 6,
    "spells": 348,
    "equipment": 166
  },
  "files": {
    "ancestries": "ancestries.json",
    "classes": "classes.json",
    "backgrounds": "backgrounds.json",
    "feats": "feats.json",
    "spells": "spells.json",
    "equipment": "equipment.json"
  },
  "sources": ["PHB", "XGE", "TCE", "WGE", "SRD"]
}
```

`schemaVersion` riguarda la forma tecnica dei file. `dataVersion` riguarda il loro contenuto. Un'aggiunta o correzione dati incrementa `dataVersion`; un cambiamento incompatibile alla struttura richiede anche una nuova strategia per `schemaVersion`.

I conteggi devono corrispondere esattamente alle lunghezze degli array. L'editor locale li aggiorna automaticamente per i cataloghi registrati.

## `ancestries.json`

Ogni record rappresenta una razza, sottorazza o variante selezionabile. Varianti come i dieci Dragonidi sono record distinti.

```json
{
  "id": "half-elf",
  "name": "Mezzelfo",
  "race": "Mezzelfo",
  "description": "Versatile e carismatico.",
  "source": "PHB",
  "bonuses": { "cha": 2 },
  "flexibleBonusCount": 2,
  "flexibleBonusOptions": ["str", "dex", "con", "int", "wis"],
  "speed": 9,
  "size": "Media",
  "darkvisionMeters": 18,
  "skillChoices": 2,
  "skillChoiceOptions": ["perception", "persuasion"],
  "traits": ["Scurovisione", "Retaggio fatato"],
  "traitDetails": [{ "name": "Retaggio fatato", "effect": "Descrizione dell'effetto." }],
  "languages": ["Comune", "Elfico"],
  "languageChoices": 1
}
```

Campi supportati:

| Campo                  | Tipo                | Effetto                                                     |
| ---------------------- | ------------------- | ----------------------------------------------------------- |
| `race`                 | stringa             | raggruppamento leggibile della razza base                   |
| `bonuses`              | oggetto             | bonus fissi alle caratteristiche                            |
| `flexibleBonusCount`   | intero              | numero di caratteristiche diverse da scegliere, ciascuna +1 |
| `flexibleBonusOptions` | `AbilityKey[]`      | limita le caratteristiche disponibili                       |
| `speed`                | numero              | velocità base in metri                                      |
| `size`                 | `Piccola` o `Media` | taglia mostrata e derivata                                  |
| `darkvisionMeters`     | numero              | genera il senso di scurovisione                             |
| `resistances`          | stringhe            | resistenze mostrate in scheda                               |
| `skillProficiencies`   | ID abilità          | competenze automatiche                                      |
| `skillChoices`         | intero              | quante competenze deve scegliere l'utente                   |
| `skillChoiceOptions`   | ID abilità          | insieme delle scelte consentite                             |
| `tools`                | stringhe            | competenze negli strumenti automatiche                      |
| `toolChoices`          | intero              | quanti strumenti deve scegliere l'utente                    |
| `toolOptions`          | stringhe            | strumenti selezionabili                                     |
| `hitPointsPerLevel`    | numero              | PF extra per livello                                        |
| `powerfulBuild`        | booleano            | raddoppia capacità di carico e movimento pesi               |
| `armorProficiencies`   | tipi armatura       | competenze razziali nelle armature                          |
| `weaponProficiencies`  | ID o categorie      | competenze razziali nelle armi                              |
| `bonusFeat`            | booleano            | segnala il talento razziale gratuito                        |
| `languages`            | stringhe            | lingue automatiche                                          |
| `languageChoices`      | intero              | numero di lingue libere, inserite nella bozza               |
| `traits`               | stringhe            | riepilogo breve per le card                                 |
| `traitDetails`         | oggetti             | nome ed effetto completo in scheda                          |
| `spellGrants`          | concessioni         | incantesimi fissi per livello                               |
| `spellChoices`         | scelte              | incantesimi selezionabili concessi dalla razza              |

Le scelte razziali vengono salvate in `ancestryBonusAbilities`, `ancestrySkillProficiencies` e `ancestryToolProficiencies`. Non modificare direttamente `bonuses` per rappresentare una scelta.

## `classes.json`

Le scelte progressive di classe sono dichiarative e vivono in `featureChoices`:

```json
{
  "featureChoices": [
    {
      "id": "sorcerer-metamagic",
      "name": "Metamagia",
      "minLevel": 3,
      "countByLevel": [
        { "level": 3, "count": 2 },
        { "level": 10, "count": 3 },
        { "level": 17, "count": 4 }
      ],
      "options": [
        {
          "id": "quickened-spell",
          "name": "Incantesimo Rapido",
          "description": "..."
        }
      ]
    }
  ]
}
```

La stessa struttura gestisce gli stili di combattimento. `countByLevel` indica quante opzioni devono essere scelte al livello raggiunto; l'interfaccia impedisce di avanzare finché la scelta non è completa.

```json
{
  "id": "wizard",
  "name": "Mago",
  "description": "Studioso della magia arcana.",
  "source": "PHB",
  "hitDie": 6,
  "primary": "int",
  "saves": ["int", "wis"],
  "subclassLevel": 2,
  "subclasses": ["Abiurazione", "Invocazione"],
  "skillChoices": 2,
  "skillOptions": ["arcana", "history", "investigation"],
  "armorProficiencies": [],
  "weaponProficiencies": ["dagger", "dart", "sling", "quarterstaff", "light-crossbow"],
  "caster": "full"
}
```

| Campo                 | Significato                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `hitDie`              | dado vita e base dei PF al 1° livello                                            |
| `primary`             | caratteristica principale e caratteristica da incantatore se `caster` è presente |
| `saves`               | due tiri salvezza competenti                                                     |
| `subclassLevel`       | livello dal quale `subclassId` diventa obbligatorio                              |
| `subclasses`          | etichette selezionabili; oggi sono salvate come stringhe                         |
| `skillChoices`        | numero di competenze di classe                                                   |
| `skillOptions`        | ID delle abilità selezionabili                                                   |
| `armorProficiencies`  | `clothing`, `light`, `medium`, `heavy`, `shield`                                 |
| `weaponProficiencies` | categorie `simple`/`martial` o ID specifici                                      |
| `caster`              | `full` o `half`; abilita CD, attacco magico e preparazione                       |
| `featureChoices`      | scelte di classe progressive, opzioni e numero richiesto per livello             |

Le tabelle degli slot, la progressione ASI, le priorità per il consiglio di classe e le risorse di classe non sono ancora data-driven: vivono in `rules.ts`. Aggiungere una nuova classe richiede quindi sia il record JSON sia l'estensione di quelle funzioni.

## `backgrounds.json`

```json
{
  "id": "acolyte",
  "name": "Accolito",
  "description": "Servizio in un tempio e conoscenza dei riti.",
  "source": "PHB",
  "skills": ["Intuizione", "Religione"],
  "languages": ["Celestiale"],
  "languageChoices": 1,
  "tools": ["Strumento fisso"],
  "toolChoices": 1
}
```

`skills` usa attualmente i nomi italiani delle abilità, mentre classi e razze usano gli ID tecnici. Il motore converte le scelte di classe/razza in nomi prima di unirle. Per evitare errori, usare esattamente i nomi presenti in `SKILLS`.

Le lingue e gli strumenti fissi vengono applicati automaticamente. Le scelte libere sono inserite dall'utente in `customLanguages` e `customTools`.

## `feats.json`

Un talento può essere puramente descrittivo oppure avere prerequisiti, effetti numerici e concessioni magiche.

```json
{
  "id": "example-feat",
  "name": "Talento di esempio",
  "description": "Descrizione breve.",
  "source": "PHB",
  "prerequisite": "Testo mostrato all'utente",
  "requirements": {
    "minimumLevel": 4,
    "spellcasting": true,
    "ancestryIds": ["elf-high", "elf-wood"],
    "anyAbility": {
      "abilities": ["int", "wis"],
      "minimum": 13
    }
  },
  "effects": {
    "abilityIncrease": {
      "amount": 1,
      "options": ["int", "wis"]
    },
    "hitPointsPerLevel": 2,
    "initiativeBonus": 5,
    "passivePerceptionBonus": 5,
    "passiveInvestigationBonus": 5,
    "notes": ["Effetto non numerico mostrato in scheda."]
  },
  "spellGrants": [{ "spellId": "misty-step", "minLevel": 1, "note": "Una volta per riposo lungo" }]
}
```

`prerequisite` è soltanto testo. I controlli reali devono essere descritti in `requirements`:

- `minimumLevel`: livello minimo totale;
- `spellcasting`: richiede che la classe abbia `caster`;
- `ancestryIds`: almeno una razza ammessa;
- `anyAbility`: almeno una delle caratteristiche elencate deve raggiungere il minimo.

Gli effetti numerici riconosciuti automaticamente sono:

- incremento di una caratteristica scelta;
- PF aggiuntivi per livello;
- bonus iniziativa;
- bonus Percezione passiva;
- bonus Indagare passivo.

Un effetto nuovo richiede quattro interventi: modello `FeatEffects`, aggregazione in `featEffectTotals()`, applicazione in `derive()` e test dedicato. Inserire soltanto una voce in `notes` non modifica i calcoli.

## Concessioni di incantesimi

Razze e talenti condividono due strutture.

Concessione fissa:

```json
{
  "spellId": "darkness",
  "minLevel": 5,
  "note": "Una volta per riposo lungo"
}
```

Scelta configurabile:

```json
{
  "id": "magic-initiate-cantrips",
  "label": "Trucchetti della tradizione scelta",
  "count": 2,
  "level": 0,
  "minLevel": 1,
  "classes": ["wizard"],
  "schools": ["Evocation"],
  "traditionKey": "magic-initiate-tradition",
  "traditionOptions": ["bard", "cleric", "druid", "sorcerer", "warlock", "wizard"]
}
```

- `id` deve essere unico tra tutte le scelte attive di razze e talenti;
- `count` indica quanti incantesimi selezionare;
- `level` filtra il livello esatto, compreso `0` per i trucchetti;
- `classes` e `schools` restringono i candidati;
- `traditionKey` collega più scelte alla stessa tradizione scelta dall'utente;
- `traditionOptions` elenca le classi/tradizioni disponibili.

Questi incantesimi sono mostrati in una sezione separata e non consumano il numero di incantesimi o trucchetti della classe.

## `spells.json`

```json
{
  "id": "absorb-elements",
  "name": "Absorb Elements",
  "description": "Testo dell'incantesimo.",
  "source": "XGE",
  "level": 1,
  "school": "Abjuration",
  "classes": ["artificer", "druid", "ranger", "sorcerer", "wizard"],
  "castingTime": {
    "amount": 1,
    "unit": "reaction",
    "text": "1 reaction",
    "condition": "Quando subisci un tipo di danno ammesso"
  },
  "range": "Self",
  "components": "S",
  "duration": {
    "unit": "round",
    "amount": 1,
    "concentration": false,
    "text": "1 round"
  },
  "attackRoll": "ranged",
  "savingThrow": "dex",
  "savingThrows": ["dex", "con"],
  "damage": {
    "formula": "1d6",
    "type": "elemental",
    "scaling": "+1d6 per livello di slot",
    "note": "Dettaglio contestuale"
  },
  "ritual": false,
  "subclassGrants": [
    {
      "classId": "artificer",
      "subclassId": "Armorer",
      "minLevel": 3,
      "note": "Sempre preparato"
    }
  ]
}
```

Unità ammesse per `castingTime.unit`: `action`, `bonus-action`, `reaction`, `minute`, `hour`, `special`.

Unità ammesse per `duration.unit`: `instantaneous`, `round`, `minute`, `hour`, `day`, `until-dispelled`, `special`. `amount` è obbligatorio per le durate misurabili; `concentration` è sempre obbligatorio.

`attackRoll` può essere `melee` o `ranged`. `savingThrow` rappresenta il TS principale; `savingThrows` permette di conservare più TS rilevati. `damage` va omesso per incantesimi senza danno.

`classes` governa il normale spell picker. `subclassGrants` rende invece l'incantesimo una concessione automatica, separata dal limite normale, quando classe, sottoclasse e livello coincidono.

## `equipment.json`

```json
{
  "id": "scale-mail",
  "name": "Corazza di scaglie",
  "category": "armor",
  "group": "Armature medie",
  "cost": "50 mo",
  "weightKg": 20.4,
  "source": "SRD",
  "armorType": "medium",
  "armorClass": 14,
  "dexterityBonus": "max-2",
  "strengthRequirement": 0,
  "stealthDisadvantage": true
}
```

Categorie ammesse:

- `armor` — armature, abiti e scudi;
- `weapon` — armi;
- `adventuring-gear` — equipaggiamento generico;
- `artisan-tool` — strumenti da artigiano.

Campi delle armature:

- `armorType`: `clothing`, `light`, `medium`, `heavy`, `shield`;
- `armorClass`: CA base;
- `dexterityBonus`: `full`, `max-2` o `none`;
- `strengthRequirement`: Forza minima;
- `stealthDisadvantage`: svantaggio alla furtività.

Campi delle armi:

```json
{
  "damage": "1d8",
  "damageType": "taglienti",
  "properties": ["versatile (1d10)"],
  "ranged": false,
  "finesse": false,
  "proficiency": "martial"
}
```

Il bonus di attacco è modificatore della caratteristica più competenza se l'arma è competente. Le armi a distanza usano Destrezza; quelle con `finesse` scelgono il migliore tra Forza e Destrezza; le altre usano Forza. Il danno mostrato aggiunge lo stesso modificatore alla formula del dado.

## Integrità e versionamento

Dopo qualunque modifica:

```powershell
npm run validate:data
```

Il validatore controlla conteggi, ID, fonti, scelte razziali, riferimenti alle abilità, classi degli incantesimi, durate, tiri salvezza, danni, concessioni, prerequisiti ed equipaggiamento.

Per un catalogo nuovo non basta creare il file. Vanno aggiornati `CatalogFiles`, `CatalogData`, `manifest.json`, `CatalogService.load()`, il validatore, la configurazione dell'editor e ogni consumer.
