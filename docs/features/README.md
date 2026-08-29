# Regole e funzionalità

## Ciclo di vita di un personaggio

La bozza contiene input e scelte. Il riepilogo non viene salvato: viene ricalcolato continuamente.

```text
Interazione utente
      │
      ▼
WizardStore.patch()
      │
      ├─ aggiorna revisione e data
      ├─ pianifica autosalvataggio
      └─ invalida i Signal calcolati
                │
                ▼
          rules.derive()
                │
                ▼
       sidebar e riepilogo aggiornati
```

Questo evita dati duplicati e incoerenti. Per esempio la CA non è salvata: deriva sempre da Destrezza, armatura e scudo correnti.

## Step del wizard

| Step            | Input principali                                | Condizione di completamento                                     |
| --------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Caratteristiche | metodo e sei punteggi, Sanità opzionale         | point buy esattamente 27 oppure altro metodo valido             |
| Discendenza     | razza/variante e scelte razziali                | tutte le scelte dichiarate nel JSON sono effettuate             |
| Classe          | classe e competenze                             | competenze di classe complete                                   |
| Background      | background e allineamento                       | selezione presente e nessuna competenza duplicata con la classe |
| Livello         | livello e metodo PF                             | valore manuale positivo quando richiesto                        |
| Talenti e ASI   | una scelta per ogni sblocco                     | numero corretto di scelte, prerequisiti e limite 20 rispettati  |
| Equipaggiamento | armatura, scudo, zaino, oggetti magici e monete | sempre navigabile                                               |
| Incantesimi     | magie della classe, concesse e Homebrew         | limiti di trucchetti e incantesimi della classe rispettati      |
| Riepilogo       | nome e dettagli della scheda                    | nome non vuoto                                                  |
| Esporta         | scheda PDF, carte incantesimo, stampa e JSON    | sempre navigabile                                               |

La navigazione all'indietro resta disponibile; quella in avanti controlla tutti gli step intermedi.

## Caratteristiche

I sei punteggi standard sono salvati in `abilities`. I bonus razziali, gli ASI e i talenti rimangono separati e vengono sommati da `derive()`:

```text
punteggio finale = base
                  + bonus razziale fisso
                  + bonus razziale scelto
                  + ASI
                  + aumento da talento
```

Il risultato naturale è limitato a 20. Il modificatore è `floor((punteggio - 10) / 2)`.

Metodi disponibili:

- `point-buy`: valori 8–15 e budget di 27 punti;
- `standard`: array precompilato 15, 14, 13, 12, 10, 8;
- `custom`: inserimento libero entro 1–20.

### Statistiche homebrew

Sanità Mentale è separata da `AbilityScores`:

- viene abilitata con `sanityEnabled`;
- usa `sanityScore` tra 0 e 20;
- non riceve bonus razziali;
- non consuma point buy;
- può raggiungere zero indipendentemente dal metodo delle caratteristiche.

Una futura statistica homebrew dovrebbe seguire lo stesso modello: campo opzionale nella bozza, normalizzazione, valore derivato separato, UI condizionale e test di indipendenza dal point buy.

## Razze e varianti

Ogni variante selezionabile è un record autonomo. La selezione applica:

- bonus fissi e flessibili;
- velocità, taglia, scurovisione e resistenze;
- competenze automatiche o scelte;
- PF extra e Costruzione Possente;
- armature, armi, strumenti e lingue;
- tratti descrittivi;
- talenti o incantesimi concessi.

Quando l'utente cambia razza vengono azzerate le scelte razziali e i talenti, perché potrebbero non essere più validi. Per aggiungere una nuova variante normalmente basta un record JSON, purché usi effetti già supportati dal modello.

## Classe e suggerimento del d20

`CLASS_ABILITY_PRIORITIES` associa a ogni classe una priorità primaria e secondaria. `isRecommendedClass()` confronta tali priorità con i due punteggi finali più alti. Le card compatibili ricevono il d20 dorato.

Una nuova classe deve essere aggiunta anche a questa mappa per poter essere consigliata.

Le competenze vengono scelte per ID tra `skillOptions`. La schermata Classe non contiene scelte dipendenti dal livello: sottoclasse, stile di combattimento e opzioni progressive sono raccolti nella schermata Livello. La sottoclasse è richiesta soltanto quando `level >= subclassLevel`; sotto tale soglia la UI mostra il livello futuro senza un select obbligatorio. Se il livello viene ridotto, la normalizzazione elimina sottoclasse e scelte non più acquisite.

Le opzioni progressive sono risolte da un unico motore data-driven. `featureChoices` descrive le scelte della classe; `subclassFeatures` usa la stessa struttura per quelle della sottoclasse selezionata. Il catalogo copre le scelte del Guerriero Totemico ai livelli 3, 6 e 14, le manovre del Maestro di Battaglia ai livelli 3, 7, 10 e 15, la Terra del Circolo, le quattro scelte progressive del Cacciatore e l'Antenato Draconico. Le opzioni selezionate confluiscono anche nel riepilogo e nel PDF.

L'Artificiere sceglie nello stesso step la competenza negli strumenti da artigiano; l'Armorer sceglie inoltre il modello Guardiano o Infiltratore. Le specializzazioni aggiungono automaticamente le competenze in strumenti e protezioni pertinenti. Battle Ready concede le armi marziali al Battle Smith e, per ogni arma magica impugnata, permette di attivare o disattivare l'uso di Intelligenza per attacco e danni. La scelta viene mantenuta anche nell'esportazione PDF.

## Background, lingue e strumenti

Le competenze fisse del background vengono applicate automaticamente. Le lingue e gli strumenti concessi “a scelta” usano selettori guidati: il contatore unisce le scelte della razza e del background, disabilita le competenze già possedute e impedisce di proseguire finché non è stato scelto il numero richiesto.

## Punti ferita

Il primo livello usa sempre:

```text
dado vita massimo + modificatore di Costituzione
```

Per i livelli successivi:

- `average`: media fissa `floor(hitDie / 2) + 1`;
- `roll`: un risultato memorizzato in `hpRolls` per livello;
- `manual`: il valore finale è preso da `manualHp`.

Ogni incremento di livello applica almeno 1 PF dopo il modificatore di Costituzione. `hitPointsPerLevel` razziale e quello dei talenti vengono moltiplicati per il livello.

## ASI e talenti

### Numero di scelte

`asiSlots()` usa il livello di classe, non un livello totale multiclasse:

- classi standard: 4, 8, 12, 16, 19;
- Guerriero: anche 6 e 14;
- Ladro: anche 10.

L'app è attualmente monoclasse, quindi `draft.level` coincide con il livello della classe.

L'Umano Variante riceve una scelta talento razziale tramite `racialFeatSlots()`. Questa scelta non consuma un ASI di classe.

### Alternative per ogni sblocco

Ogni slot di classe rappresenta una sola alternativa:

- +2 a una caratteristica;
- +1 a due caratteristiche diverse;
- un talento.

`classChoicesUsed()` conta un talento di classe come una scelta e ogni due punti ASI come una scelta. `growthChoicesComplete()` verifica che il totale coincida esattamente con `asiSlots()`, che gli ASI siano completi e che nessuna caratteristica superi 20.

### Prerequisiti

`featEligible()` controlla i campi strutturati di `requirements`. L'interfaccia impedisce di scegliere talenti non idonei e ricontrolla le scelte quando classe, razza o livello cambiano.

### Effetti

`featEffectTotals()` aggrega tutti i talenti selezionati. `derive()` applica il risultato a caratteristiche, PF, iniziativa e passive. Le note descrittive vengono conservate per la scheda, ma non producono automaticamente effetti numerici.

Per implementare un nuovo tipo di effetto:

1. aggiungere il campo a `FeatEffects`;
2. impostare il campo nel JSON;
3. inizializzare e sommare il valore in `featEffectTotals()`;
4. applicarlo nel punto corretto di `derive()`;
5. mostrarlo nel riepilogo se necessario;
6. aggiungere un test unitario con almeno due talenti cumulabili.

## Abilità, tiri salvezza e passive

Ogni abilità è legata a una caratteristica tramite `SKILLS`.

```text
abilità non competente = modificatore
abilità competente     = modificatore + bonus competenza
```

Le competenze di classe, razza e background confluiscono in un insieme unico. Nel riepilogo quelle competenti sono evidenziate. I tiri salvezza usano le due caratteristiche dichiarate da `class.saves`.

```text
Percezione passiva = 10 + Percezione + bonus da talenti
Indagare passivo   = 10 + Indagare + bonus da talenti
```

## Equipaggiamento e armatura

Ogni oggetto aggiunto entra nello zaino come `InventoryEntry` con ID e quantità. Il peso totale è la somma di `weightKg × quantity`.

Il catalogo mostra dodici risultati per pagina. Le intestazioni ordinano nome, tipo, costo e peso in entrambi i versi; il criterio viene applicato all'intero risultato prima della paginazione. Se è attivo il filtro **Oggetti magici**, compaiono anche le colonne ordinabili **Rarità** e **Richiede sintonia**, quest'ultima resa come valore booleano Sì/No. Anche le colonne dello zaino sono ordinabili.

La capacità di carico è convertita in chilogrammi:

```text
carico = Forza × 15 lb × 0,45359237
spingere/trascinare/sollevare = Forza × 30 lb × 0,45359237
```

Costruzione Possente raddoppia entrambi i valori.

La CA usa:

```text
CA = base armatura + Destrezza consentita + 2 se usa scudo
```

`dexterityBonus` governa il contributo di Destrezza. La competenza deriva dalla classe, dalla razza e da alcune sottoclassi gestite esplicitamente in `derive()`.

### Oggetti magici, Homebrew e sintonia

Il catalogo base di `equipment.json` viene unito ai 244 record di `magic-equipment.json`; gli oggetti creati dall'utente in `homebrewEquipment` vengono poi aggiunti dallo store allo stesso insieme. Non esistono inventari o motori paralleli: catalogo SRD e Homebrew usano `EquipmentItem`, `InventoryEntry`, equipaggiamento, calcoli e persistenza comuni.

L'editor Homebrew permette un solo tipo compatibile tra arma, armatura, scudo, oggetto, strumento o altro. In base al tipo mostra soltanto i campi pertinenti. Può inoltre configurare:

- rarità, natura magica e requisiti di sintonia;
- bonus di arma o armatura e danni aggiuntivi;
- effetti passivi o attivi con condizioni e costi in cariche;
- incantesimi concessi tramite gli ID del catalogo;
- cariche massime e modalità di recupero.

Gli effetti passivi entrano in `derive()` soltanto quando l'oggetto è equipaggiato e, se richiesto, in sintonia. Il limite normale è tre oggetti; per l'Artificiere sale a quattro al livello 10, cinque al 14 e sei al 18. Lo store normalizza la bozza con il limite del livello corrente e l'interfaccia mostra sempre slot occupati e disponibili. CA, caratteristiche, iniziativa, tiri salvezza, resistenze, attacchi e danni usano così lo stesso flusso di calcolo della scheda. Le cariche correnti sono salvate in `equipmentCharges` e i comandi attivi scalano il costo configurato.

## Armi

Il componente determina la caratteristica d'attacco:

- armi a distanza: Destrezza;
- armi con proprietà finesse: migliore tra Forza e Destrezza;
- altre armi: Forza.

Il bonus di competenza viene aggiunto soltanto se la classe o la razza è competente con l'ID dell'arma o con la sua categoria. Il danno mostra la formula del catalogo più il modificatore della caratteristica.

## Incantesimi

Il testo successivo a `At Higher Levels.` viene mostrato in un riquadro separato **Ai livelli superiori**, così l'effetto dell'upcasting resta distinguibile dalla descrizione base. Se in futuro il catalogo fornisce `higherLevels`, quel campo ha precedenza; i dati SRD esistenti vengono letti anche dalla descrizione completa.

### Lista normale

`availableSpells` include soltanto gli incantesimi che:

- dichiarano la classe corrente in `classes`;
- non superano `maximumSpellLevel()`;
- non sono già concessi gratuitamente da razza, talento o sottoclasse.

Il componente divide trucchetti e incantesimi di livello, offre ricerca e filtro, mostra quattro risultati per pagina e visualizza gli slot forniti da `spellSlots()`. `spellSelectionLimits()` definisce separatamente il massimo di trucchetti e incantesimi per classe e livello; il selettore disabilita nuove scelte quando il relativo limite è raggiunto.

Gli incantesimi Homebrew conservano esplicitamente `concentration`. Il valore viene normalizzato in `duration.concentration`, mostrato nelle card e mantenuto nelle esportazioni.

### Incantesimi concessi

Le magie da razza, talento, sottoclasse e oggetti equipaggiati sono separate dalla selezione normale. Le concessioni fisse rispettano `minLevel`; quelle configurabili sono memorizzate in `grantedSpellChoices`. Non consumano il numero normale di magie conosciute o preparate. Un incantesimo concesso da un oggetto che richiede sintonia diventa disponibile soltanto quando la sintonia è attiva.

### Calcoli magici

Per una classe con `caster`:

```text
attacco magico = competenza + modificatore caratteristica primaria
CD incantesimi = 8 + competenza + modificatore caratteristica primaria
```

`preparedSpells` continua a rappresentare il valore derivato mostrato nella scheda; i limiti del selettore sono invece determinati dalle tabelle per classe e livello di `spellSelectionLimits()`.

Warlock usa slot del Patto e Arcanum in `spellSlots()`. Artefice usa progressione da mezzo incantatore arrotondata per eccesso.

## Scelte di classe progressive

Guerriero, Paladino e Ranger espongono gli stili di combattimento ai rispettivi livelli di sblocco. Lo Stregone sceglie due opzioni di Metamagia al 3° livello, una terza al 10° e una quarta al 17°.

Le scelte sono salvate in `CharacterDraft.classFeatureChoices`, ricompaiono quando si ricarica il personaggio e sono riportate nel riepilogo con la descrizione dei loro effetti. La pagina del livello ripropone le scelte appena sbloccate, perché il livello viene deciso dopo la classe nel flusso guidato.

Il modello supporta conteggi cumulativi per livello, opzioni sbloccate a livelli diversi, prerequisiti basati su una scelta precedente, gruppi reciprocamente esclusivi e opzioni ripetibili. La normalizzazione elimina selezioni obsolete quando cambiano livello, classe o sottoclasse. Segreti Magici del Bardo e Segreti Magici Aggiuntivi del Collegio della Sapienza usano lo stesso meccanismo e concedono gli incantesimi selezionati senza introdurre uno stato parallelo.

## Risorse di classe

`classResources()` produce le risorse visibili nel riepilogo: Ire, Ispirazione bardica, Incanalare Divinità, Forma Selvatica, Azione Impetuosa, dadi di superiorità, Ki, Attacco Furtivo, Imposizione delle Mani, Punti Stregoneria, slot del Patto, Recupero Arcano e infusioni dell'Artefice.

`classProgression` e `subclassProgressions` collegano i privilegi ottenuti al livello, al tipo di attivazione e, quando applicabile, alla risorsa consumata. Il riepilogo e il PDF costruiscono la lista dei privilegi dal catalogo, includendo classe, sottoclasse, discendenza e opzioni effettivamente selezionate.

Le tabelle sono attualmente nel codice. Per aggiungere o correggere una progressione, modificare il relativo ramo dello `switch` e aggiungere asserzioni in `rules.spec.ts` ai livelli di soglia.

## Esportazione sulla scheda ufficiale

Il comando **Scarica scheda PDF compilata** carica il modello compilabile conservato in `public/pdf/scheda-personaggio.pdf` e usa `pdf-lib` per valorizzarne direttamente i campi AcroForm.

La mappatura è divisa tra le tre pagine:

- statistiche, tiri salvezza, abilità, combattimento, equipaggiamento e tratti;
- aspetto, storia, dettagli razziali, talenti e risorse di classe;
- caratteristica da incantatore, CD, attacco magico, slot e incantesimi selezionati o concessi.

Il modello contiene 364 campi AcroForm distribuiti sulle tre pagine. `character-sheet-pdf.ts` associa i dati del personaggio ai nomi dei campi (comprese caselle di competenza, tiri contro morte e preparazione degli incantesimi), senza disegnare testo tramite coordinate. Il PDF esportato resta modificabile. Il servizio `CharacterSheetPdfService` gestisce caricamento e download; il service worker conserva il modello per l'uso offline.

### Carte incantesimo PDF

Il comando **Esporta carte incantesimo** è disponibile sia nello step Incantesimi sia nella pagina finale. `SpellCardsPdfService` raccoglie magie selezionate, concesse e Homebrew, elimina i duplicati e le ordina prima per livello e poi alfabeticamente. Anche gli incantesimi forniti da oggetti equipaggiati e correttamente in sintonia vengono inclusi.

Ogni carta riporta livello, scuola, tempo di lancio, gittata, componenti, durata, rituale, concentrazione e descrizione. Il colore identifica il livello:

| Livello | Colore          | HEX       |
| ------: | --------------- | --------- |
|       0 | Grigio argento  | `#A8B0BA` |
|       1 | Azzurro         | `#5BA7D1` |
|       2 | Verde smeraldo  | `#4FAF78` |
|       3 | Turchese        | `#3CA6A6` |
|       4 | Blu zaffiro     | `#4778C7` |
|       5 | Viola           | `#7955B5` |
|       6 | Magenta         | `#B6539A` |
|       7 | Rosso cremisi   | `#C94A4A` |
|       8 | Arancio ardente | `#E47735` |
|       9 | Oro leggendario | `#E0B83F` |

## Completamento e compatibilità

`DerivedCharacter.completed` fornisce un indicatore sintetico, mentre `WizardComponent.stepComplete()` governa realmente la navigazione. Le due nozioni non sono identiche: quando si aggiunge uno step o un requisito bisogna valutarle entrambe.

I vecchi personaggi vengono adattati da `WizardStore.normalize()`. Ogni nuovo array o oggetto opzionale deve ricevere un valore predefinito per evitare errori sui salvataggi precedenti.
