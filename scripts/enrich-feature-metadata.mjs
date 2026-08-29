import { readFile, writeFile } from 'node:fs/promises';

const classesPath = new URL('../public/data/v1/classes.json', import.meta.url);
const spellsPath = new URL('../public/data/v1/spells.json', import.meta.url);
const classes = JSON.parse(await readFile(classesPath, 'utf8'));
const spells = JSON.parse(await readFile(spellsPath, 'utf8'));

const f = (level, name, description, metadata = {}) => ({ level, name, description, ...metadata });
const core = {
  barbarian: [
    f(
      1,
      'Ira',
      'Entri in ira come azione bonus, ottenendo i benefici e gli usi indicati nelle risorse.',
      { activations: ['bonus-action'], resource: 'Ire', resourceCost: '1 uso' },
    ),
    f(
      1,
      'Difesa senza Armatura',
      'Senza armatura, la CA è 10 + Destrezza + Costituzione; puoi usare uno scudo.',
    ),
    f(
      2,
      'Attacco Irruento',
      'Al primo attacco del turno puoi ottenere vantaggio con Forza, concedendo vantaggio agli attacchi contro di te fino al turno successivo.',
    ),
    f(
      2,
      'Percezione del Pericolo',
      'Hai vantaggio ai tiri salvezza di Destrezza contro effetti visibili se non sei incapacitato.',
    ),
    f(5, 'Attacco Extra', 'Quando effettui l’azione Attacco puoi attaccare due volte.'),
    f(5, 'Movimento Veloce', 'La velocità aumenta di 3 m quando non indossi armatura pesante.'),
    f(
      7,
      'Istinto Ferino',
      'Hai vantaggio all’iniziativa e puoi agire nel primo turno quando sorpreso entrando subito in ira.',
    ),
    f(
      9,
      'Critico Brutale',
      'Aggiungi un dado dell’arma ai critici; due dadi al 13° livello e tre al 17°.',
    ),
    f(
      11,
      'Ira Implacabile',
      'Durante l’ira puoi evitare di scendere a 0 PF superando un tiro salvezza di Costituzione.',
    ),
    f(
      15,
      'Ira Persistente',
      'L’ira termina prima soltanto se perdi i sensi o scegli di terminarla.',
    ),
    f(
      18,
      'Potenza Indomabile',
      'Se una prova di Forza è inferiore al punteggio di Forza, usa il punteggio al posto del risultato.',
    ),
    f(20, 'Campione Primordiale', 'Forza e Costituzione aumentano di 4 e possono raggiungere 24.'),
  ],
  bard: [
    f(1, 'Incantesimi', 'Lanci incantesimi da Bardo usando Carisma.'),
    f(
      1,
      'Ispirazione Bardica',
      'Come azione bonus concedi un dado di ispirazione a una creatura che può sentirti.',
      { activations: ['bonus-action'], resource: 'Ispirazione bardica', resourceCost: '1 dado' },
    ),
    f(2, 'Factotum', 'Aggiungi metà del bonus di competenza alle prove che non lo includono già.'),
    f(
      2,
      'Canto di Riposo',
      'Durante un riposo breve gli alleati che spendono dadi vita recuperano PF aggiuntivi.',
    ),
    f(3, 'Collegio Bardico', 'Ottieni i privilegi del collegio scelto.'),
    f(
      3,
      'Maestria',
      'Raddoppi la competenza per le abilità selezionate; scegli ancora al 10° livello.',
    ),
    f(5, 'Fonte di Ispirazione', 'Recuperi l’Ispirazione Bardica anche con un riposo breve.', {
      resource: 'Ispirazione bardica',
    }),
    f(
      6,
      'Controfascino',
      'Come azione inizi un’esibizione che concede vantaggio contro paura e fascinazione.',
      { activations: ['action'] },
    ),
    f(
      10,
      'Segreti Magici',
      'Impari due incantesimi da qualsiasi classe; ne impari altri al 14° e 18° livello.',
    ),
    f(
      20,
      'Ispirazione Superiore',
      'Quando tiri iniziativa senza Ispirazione Bardica ne recuperi un uso.',
      { resource: 'Ispirazione bardica' },
    ),
  ],
  cleric: [
    f(1, 'Incantesimi', 'Prepari e lanci incantesimi da Chierico usando Saggezza.'),
    f(1, 'Dominio Divino', 'Ottieni i privilegi e gli incantesimi del dominio scelto.'),
    f(
      2,
      'Incanalare Divinità: Scacciare Non Morti',
      'Come azione presenti il simbolo sacro e costringi i non morti vicini a fuggire.',
      { activations: ['action'], resource: 'Incanalare Divinità', resourceCost: '1 uso' },
    ),
    f(
      5,
      'Distruggere Non Morti',
      'I non morti di basso grado di sfida che falliscono contro Scacciare Non Morti vengono distrutti.',
      { resource: 'Incanalare Divinità' },
    ),
    f(
      10,
      'Intervento Divino',
      'Come azione chiedi l’intervento della divinità; la probabilità dipende dal livello.',
      {
        activations: ['action'],
        uses: '1 tentativo',
        recovery: 'riposo lungo; 7 giorni dopo un successo',
      },
    ),
    f(
      20,
      'Intervento Divino Migliorato',
      'La richiesta di Intervento Divino riesce automaticamente.',
    ),
  ],
  druid: [
    f(1, 'Druidico', 'Conosci il linguaggio segreto dei druidi.'),
    f(1, 'Incantesimi', 'Prepari e lanci incantesimi da Druido usando Saggezza.'),
    f(2, 'Forma Selvatica', 'Come azione assumi la forma di una bestia consentita dal livello.', {
      activations: ['action'],
      resource: 'Forma Selvatica',
      resourceCost: '1 uso',
    }),
    f(2, 'Circolo Druidico', 'Ottieni i privilegi del circolo scelto.'),
    f(
      4,
      'Miglioramento della Forma Selvatica',
      'Puoi assumere forme fino a GS 1/2 e con velocità di nuoto.',
      { resource: 'Forma Selvatica' },
    ),
    f(
      8,
      'Miglioramento della Forma Selvatica',
      'Puoi assumere forme fino a GS 1 e con velocità di volo.',
      { resource: 'Forma Selvatica' },
    ),
    f(18, 'Corpo Senza Tempo', 'Invecchi dieci volte più lentamente.'),
    f(
      18,
      'Incantesimi Bestiali',
      'Puoi eseguire componenti verbali e somatiche degli incantesimi in Forma Selvatica.',
      { resource: 'Forma Selvatica' },
    ),
    f(
      20,
      'Arcidruido',
      'Puoi usare Forma Selvatica senza limiti e ignorare molte componenti degli incantesimi.',
      { resource: 'Forma Selvatica' },
    ),
  ],
  fighter: [
    f(1, 'Stile di Combattimento', 'Ottieni il beneficio dello stile selezionato.'),
    f(1, 'Recuperare Energie', 'Come azione bonus recuperi 1d10 + livello da Guerriero PF.', {
      activations: ['bonus-action'],
      resource: 'Recuperare Energie',
      resourceCost: '1 uso',
    }),
    f(2, 'Azione Impetuosa', 'Nel tuo turno ottieni un’azione aggiuntiva.', {
      resource: 'Azione Impetuosa',
      resourceCost: '1 uso',
    }),
    f(3, 'Archetipo Marziale', 'Ottieni i privilegi dell’archetipo scelto.'),
    f(
      5,
      'Attacco Extra',
      'Attacchi due volte con l’azione Attacco; tre volte all’11° e quattro al 20°.',
    ),
    f(9, 'Indomito', 'Ripeti un tiro salvezza fallito; ottieni più usi al 13° e 17°.', {
      resource: 'Indomito',
      resourceCost: '1 uso',
    }),
  ],
  monk: [
    f(1, 'Difesa senza Armatura', 'Senza armatura né scudo, la CA è 10 + Destrezza + Saggezza.'),
    f(
      1,
      'Arti Marziali',
      'Usi Destrezza e il dado di arti marziali con colpi senz’armi e armi da monaco.',
    ),
    f(2, 'Ki', 'Ottieni una riserva di punti ki che recuperi con un riposo breve o lungo.', {
      resource: 'Punti ki',
    }),
    f(
      2,
      'Raffica di Colpi',
      'Dopo l’azione Attacco effettui due colpi senz’armi come azione bonus.',
      { activations: ['bonus-action'], resource: 'Punti ki', resourceCost: '1 punto' },
    ),
    f(2, 'Difesa Paziente', 'Usi Schivare come azione bonus.', {
      activations: ['bonus-action'],
      resource: 'Punti ki',
      resourceCost: '1 punto',
    }),
    f(2, 'Passo del Vento', 'Usi Disimpegno o Scatto come azione bonus e raddoppi il salto.', {
      activations: ['bonus-action'],
      resource: 'Punti ki',
      resourceCost: '1 punto',
    }),
    f(
      2,
      'Movimento senza Armatura',
      'La velocità aumenta senza armatura né scudo e cresce con il livello.',
    ),
    f(3, 'Tradizione Monastica', 'Ottieni i privilegi della tradizione scelta.'),
    f(
      3,
      'Deviare Proiettili',
      'Come reazione riduci il danno di un attacco a distanza e puoi rilanciare il proiettile.',
      {
        activations: ['reaction'],
        resource: 'Punti ki',
        resourceCost: '1 punto solo per rilanciare',
      },
    ),
    f(4, 'Caduta Lenta', 'Come reazione riduci i danni da caduta.', { activations: ['reaction'] }),
    f(5, 'Attacco Extra', 'Quando effettui l’azione Attacco puoi attaccare due volte.'),
    f(5, 'Colpo Stordente', 'Dopo un colpo in mischia puoi tentare di stordire il bersaglio.', {
      resource: 'Punti ki',
      resourceCost: '1 punto',
    }),
    f(6, 'Colpi Ki Potenziati', 'I colpi senz’armi sono magici contro resistenze e immunità.'),
    f(7, 'Elusione', 'Riduci o annulli i danni degli effetti con tiro salvezza di Destrezza.'),
    f(7, 'Quiete della Mente', 'Come azione termini su di te paura o fascinazione.', {
      activations: ['action'],
    }),
    f(10, 'Purezza del Corpo', 'Sei immune a malattie e veleno.'),
    f(
      13,
      'Lingua del Sole e della Luna',
      'Comprendi tutte le lingue parlate e sei compreso dalle creature che conoscono una lingua.',
    ),
    f(
      14,
      'Anima Adamantina',
      'Ottieni competenza in tutti i tiri salvezza e puoi ripeterne uno fallito.',
      { resource: 'Punti ki', resourceCost: '1 punto per ripetere' },
    ),
    f(
      15,
      'Corpo Senza Tempo',
      'Non subisci la fragilità della vecchiaia e non hai bisogno di cibo o acqua.',
    ),
    f(
      18,
      'Corpo Vuoto',
      'Come azione diventi invisibile e resistente ai danni, oppure lanci Proiezione Astrale.',
      { activations: ['action'], resource: 'Punti ki', resourceCost: '4 o 8 punti' },
    ),
    f(20, 'Perfezione Interiore', 'Quando tiri iniziativa con 0 punti ki ne recuperi 4.', {
      resource: 'Punti ki',
    }),
  ],
  paladin: [
    f(
      1,
      'Percezione del Divino',
      'Come azione percepisci celestiali, immondi, non morti e luoghi consacrati.',
      { activations: ['action'], uses: '1 + modificatore di Carisma', recovery: 'riposo lungo' },
    ),
    f(
      1,
      'Imposizione delle Mani',
      'Come azione spendi punti della riserva per curare o neutralizzare malattie e veleni.',
      { activations: ['action'], resource: 'Imposizione delle mani' },
    ),
    f(2, 'Stile di Combattimento', 'Ottieni il beneficio dello stile selezionato.'),
    f(2, 'Incantesimi', 'Prepari e lanci incantesimi da Paladino usando Carisma.'),
    f(
      2,
      'Punizione Divina',
      'Quando colpisci in mischia spendi uno slot per infliggere danni radiosi aggiuntivi.',
      { resource: 'Slot incantesimo', resourceCost: '1 slot' },
    ),
    f(3, 'Salute Divina', 'Sei immune alle malattie.'),
    f(
      3,
      'Giuramento Sacro',
      'Ottieni incantesimi, opzioni di Incanalare Divinità e privilegi del giuramento.',
    ),
    f(5, 'Attacco Extra', 'Quando effettui l’azione Attacco puoi attaccare due volte.'),
    f(
      6,
      'Aura di Protezione',
      'Tu e gli alleati vicini aggiungete Carisma ai tiri salvezza; il raggio aumenta al 18°.',
    ),
    f(
      10,
      'Aura di Coraggio',
      'Tu e gli alleati vicini non potete essere spaventati; il raggio aumenta al 18°.',
    ),
    f(
      11,
      'Punizione Divina Migliorata',
      'Ogni colpo in mischia infligge 1d8 danni radiosi aggiuntivi.',
    ),
    f(
      14,
      'Tocco Purificatore',
      'Come azione termini un incantesimo su te stesso o una creatura consenziente.',
      { activations: ['action'], resource: 'Tocco purificatore', resourceCost: '1 uso' },
    ),
  ],
  ranger: [
    f(1, 'Nemico Prescelto', 'Ottieni i benefici relativi ai tipi di nemico selezionati.'),
    f(1, 'Esploratore Nato', 'Ottieni i benefici relativi ai terreni favoriti selezionati.'),
    f(2, 'Stile di Combattimento', 'Ottieni il beneficio dello stile selezionato.'),
    f(2, 'Incantesimi', 'Conosci e lanci incantesimi da Ranger usando Saggezza.'),
    f(3, 'Archetipo del Ranger', 'Ottieni i privilegi dell’archetipo scelto.'),
    f(
      3,
      'Consapevolezza Primordiale',
      'Come azione spendi uno slot per percepire certi tipi di creature nella regione.',
      { activations: ['action'], resource: 'Slot incantesimo', resourceCost: '1 slot' },
    ),
    f(5, 'Attacco Extra', 'Quando effettui l’azione Attacco puoi attaccare due volte.'),
    f(
      8,
      'Andatura sul Territorio',
      'Ignori terreno difficile non magico e resisti alle piante magiche.',
    ),
    f(
      10,
      'Nascondersi in Piena Vista',
      'Prepari una mimetizzazione che migliora Furtività restando immobile.',
    ),
    f(
      14,
      'Svanire',
      'Usi Nascondersi come azione bonus e non lasci tracce contro la tua volontà.',
      { activations: ['bonus-action'] },
    ),
    f(
      18,
      'Sensi Ferini',
      'Combatti creature invisibili senza il normale svantaggio e ne percepisci la posizione vicina.',
    ),
    f(
      20,
      'Sterminatore di Nemici',
      'Una volta per turno aggiungi Saggezza a un attacco o danno contro un nemico prescelto.',
    ),
  ],
  rogue: [
    f(
      1,
      'Maestria',
      'Raddoppi la competenza per le opzioni selezionate; scegli ancora al 6° livello.',
    ),
    f(
      1,
      'Attacco Furtivo',
      'Una volta per turno infliggi danni aggiuntivi quando soddisfi le condizioni.',
    ),
    f(1, 'Gergo Ladresco', 'Conosci il codice segreto dei ladri.'),
    f(2, 'Azione Scaltra', 'Usi Scatto, Disimpegno o Nascondersi come azione bonus.', {
      activations: ['bonus-action'],
    }),
    f(3, 'Archetipo Ladresco', 'Ottieni i privilegi dell’archetipo scelto.'),
    f(
      5,
      'Schivata Prodigiosa',
      'Come reazione dimezzi i danni di un attacco visibile che ti colpisce.',
      { activations: ['reaction'] },
    ),
    f(7, 'Elusione', 'Riduci o annulli i danni degli effetti con tiro salvezza di Destrezza.'),
    f(
      11,
      'Talento Affidabile',
      'Tratti come 10 i risultati bassi nelle prove che includono competenza.',
    ),
    f(
      14,
      'Percezione Cieca',
      'Individui creature nascoste o invisibili entro 3 m se puoi sentire.',
    ),
    f(15, 'Mente Sfuggente', 'Ottieni competenza nei tiri salvezza di Saggezza.'),
    f(
      18,
      'Inafferrabile',
      'Gli attacchi contro di te non hanno vantaggio finché non sei incapacitato.',
    ),
    f(
      20,
      'Colpo di Fortuna',
      'Trasformi un attacco mancato in un colpo o una prova fallita in 20.',
      { uses: '1 uso', recovery: 'riposo breve o lungo' },
    ),
  ],
  sorcerer: [
    f(1, 'Incantesimi', 'Conosci e lanci incantesimi da Stregone usando Carisma.'),
    f(1, 'Origine Stregonesca', 'Ottieni i privilegi dell’origine scelta.'),
    f(2, 'Fonte di Magia', 'Ottieni punti stregoneria e conversione flessibile con gli slot.', {
      resource: 'Punti stregoneria',
    }),
    f(3, 'Metamagia', 'Applichi agli incantesimi le opzioni di Metamagia selezionate.', {
      resource: 'Punti stregoneria',
    }),
    f(20, 'Ripristino Stregonesco', 'Recuperi 4 punti stregoneria con un riposo breve.', {
      resource: 'Punti stregoneria',
    }),
  ],
  warlock: [
    f(1, 'Patrono Ultraterreno', 'Ottieni i privilegi del patrono scelto.'),
    f(
      1,
      'Magia del Patto',
      'Lanci incantesimi usando slot del Patto recuperati con un riposo breve o lungo.',
      { resource: 'Slot del Patto' },
    ),
    f(2, 'Suppliche Occulte', 'Ottieni le suppliche selezionate e ne impari altre con il livello.'),
    f(3, 'Dono del Patto', 'Ottieni il dono selezionato.'),
    f(
      11,
      'Arcanum Mistico (6°)',
      'Lanci una volta un incantesimo di 6° livello scelto senza spendere slot.',
      { uses: '1 uso', recovery: 'riposo lungo' },
    ),
    f(
      13,
      'Arcanum Mistico (7°)',
      'Lanci una volta un incantesimo di 7° livello scelto senza spendere slot.',
      { uses: '1 uso', recovery: 'riposo lungo' },
    ),
    f(
      15,
      'Arcanum Mistico (8°)',
      'Lanci una volta un incantesimo di 8° livello scelto senza spendere slot.',
      { uses: '1 uso', recovery: 'riposo lungo' },
    ),
    f(
      17,
      'Arcanum Mistico (9°)',
      'Lanci una volta un incantesimo di 9° livello scelto senza spendere slot.',
      { uses: '1 uso', recovery: 'riposo lungo' },
    ),
    f(20, 'Maestro dell’Occulto', 'In un minuto recuperi tutti gli slot del Patto.', {
      uses: '1 uso',
      recovery: 'riposo lungo',
      resource: 'Slot del Patto',
    }),
  ],
  wizard: [
    f(
      1,
      'Incantesimi',
      'Prepari e lanci incantesimi da Mago usando Intelligenza e il libro degli incantesimi.',
    ),
    f(
      1,
      'Recupero Arcano',
      'Dopo un riposo breve recuperi livelli di slot pari a metà del livello da Mago.',
      { resource: 'Recupero Arcano', resourceCost: '1 uso' },
    ),
    f(2, 'Tradizione Arcana', 'Ottieni i privilegi della tradizione scelta.'),
    f(
      18,
      'Maestria negli Incantesimi',
      'Scegli un incantesimo di 1° e uno di 2° livello da lanciare a volontà.',
    ),
    f(
      20,
      'Incantesimi Personali',
      'Scegli due incantesimi di 3° livello sempre preparati e lanciabili gratuitamente una volta ciascuno.',
      { recovery: 'riposo breve o lungo' },
    ),
  ],
  artificer: [
    f(1, 'Congegno Magico', 'Infondi magia minore in oggetti minuscoli non magici.', {
      resource: 'Congegno magico',
    }),
    f(1, 'Incantesimi', 'Prepari e lanci incantesimi da Artefice usando Intelligenza e strumenti.'),
    f(2, 'Infondere Oggetto', 'Conosci infusioni e ne mantieni attivo il numero indicato.', {
      resource: 'Infusioni attive',
    }),
    f(
      3,
      'Lo Strumento Giusto per il Lavoro',
      'Con strumenti da ladro o artigiano crei magicamente un set di strumenti da artigiano.',
    ),
    f(3, 'Specialista Artefice', 'Ottieni i privilegi della specializzazione scelta.'),
    f(
      7,
      'Lampo di Genio',
      'Come reazione aggiungi Intelligenza a una prova o tiro salvezza vicino.',
      { activations: ['reaction'], resource: 'Lampo di genio', resourceCost: '1 uso' },
    ),
    f(
      10,
      'Adepto degli Oggetti Magici',
      'Ottieni uno slot di sintonia aggiuntivo e crei più rapidamente oggetti comuni e non comuni.',
    ),
    f(
      11,
      'Oggetto Conserva Incantesimo',
      'Conservi in un oggetto un incantesimo di 1° o 2° livello utilizzabile più volte.',
    ),
    f(
      14,
      'Sapiente degli Oggetti Magici',
      'Ottieni un altro slot di sintonia e ignori requisiti di classe, razza, incantesimi e livello.',
    ),
    f(18, 'Maestro degli Oggetti Magici', 'Puoi entrare in sintonia con sei oggetti.'),
    f(
      20,
      'Anima dell’Artificio',
      'Ottieni bonus ai tiri salvezza dagli oggetti in sintonia e puoi evitare di scendere a 0 PF terminando un’infusione.',
      { activations: ['reaction'] },
    ),
  ],
};

function metadataFor(feature) {
  const text = `${feature.name} ${feature.description}`.toLocaleLowerCase('it');
  const activations = [];
  if (text.includes('azione bonus')) activations.push('bonus-action');
  if (text.includes('reazione')) activations.push('reaction');
  if (/come azione|usare l['’]azione|effettui l['’]azione/.test(text)) activations.push('action');
  const resource = text.includes('incanalare divinità')
    ? 'Incanalare Divinità'
    : /punt[oi] ki|\bki\b/.test(text)
      ? 'Punti ki'
      : text.includes('ispirazione bardica')
        ? 'Ispirazione bardica'
        : text.includes('forma selvatica')
          ? 'Forma Selvatica'
          : text.includes('dado di superiorità') || text.includes('dadi di superiorità')
            ? 'Dadi di superiorità'
            : text.includes('punti stregoneria')
              ? 'Punti stregoneria'
              : undefined;
  return {
    ...feature,
    ...(feature.activations ? {} : { activations: activations.length ? activations : ['passive'] }),
    ...(feature.resource || !resource ? {} : { resource }),
  };
}

const spellOptions = spells.map((spell) => ({
  id: spell.id,
  name: spell.name,
  description: `${spell.level === 0 ? 'Trucchetto' : `Incantesimo di ${spell.level}° livello`} · ${spell.school}.`,
  minLevel: Math.max(6, spell.level === 0 ? 6 : spell.level * 2 - 1),
}));

const spellChoice = (id, name, description, minLevel, count, options, extra = {}) => ({
  id,
  name,
  description,
  minLevel,
  countByLevel: [{ level: minLevel, count }],
  options: options.map(metadataFor),
  ...extra,
});

for (const klass of classes) {
  klass.classProgression = (core[klass.id] ?? []).map(metadataFor);
  for (const progression of klass.subclassProgressions ?? [])
    progression.features = progression.features.map(metadataFor);
  for (const choice of [
    ...(klass.featureChoices ?? []),
    ...(klass.subclassFeatures ?? []).flatMap((item) => item.choices ?? []),
  ]) {
    choice.options = choice.options.map(metadataFor);
    if (choice.id === 'champion-additional-fighting-style')
      choice.exclusiveWithChoices = ['fighter-fighting-style'];
    if (
      ['kensei-melee-weapon', 'kensei-ranged-weapon', 'kensei-additional-weapons'].includes(
        choice.id,
      )
    )
      choice.exclusiveWithChoices = [
        'kensei-melee-weapon',
        'kensei-ranged-weapon',
        'kensei-additional-weapons',
      ].filter((id) => id !== choice.id);
  }
  if (klass.id === 'bard') {
    klass.featureChoices ??= [];
    if (!klass.featureChoices.some((choice) => choice.id === 'bard-magical-secrets'))
      klass.featureChoices.push({
        id: 'bard-magical-secrets',
        name: 'Segreti Magici',
        description: 'Scegli incantesimi da qualsiasi classe entro il livello che puoi lanciare.',
        minLevel: 10,
        countByLevel: [
          { level: 10, count: 2 },
          { level: 14, count: 4 },
          { level: 18, count: 6 },
        ],
        options: spellOptions.map((option) => ({
          ...option,
          minLevel: Math.max(10, option.minLevel),
        })),
        effect: 'spell-grant',
      });
    klass.subclassFeatures ??= [];
    let lore = klass.subclassFeatures.find((item) => item.subclassId === 'Collegio della Sapienza');
    if (!lore) {
      lore = { subclassId: 'Collegio della Sapienza', choices: [] };
      klass.subclassFeatures.push(lore);
    }
    if (lore && !lore.choices.some((choice) => choice.id === 'bard-lore-magical-secrets'))
      lore.choices.push({
        id: 'bard-lore-magical-secrets',
        name: 'Segreti Magici Aggiuntivi',
        description:
          'Scegli due incantesimi da qualsiasi classe entro il livello che puoi lanciare.',
        minLevel: 6,
        countByLevel: [{ level: 6, count: 2 }],
        options: spellOptions,
        effect: 'spell-grant',
      });
    const magicalSecrets = klass.featureChoices.find(
      (choice) => choice.id === 'bard-magical-secrets',
    );
    const additionalSecrets = lore?.choices.find(
      (choice) => choice.id === 'bard-lore-magical-secrets',
    );
    if (magicalSecrets) magicalSecrets.exclusiveWithChoices = ['bard-lore-magical-secrets'];
    if (additionalSecrets) additionalSecrets.exclusiveWithChoices = ['bard-magical-secrets'];
  }
  if (klass.id === 'warlock') {
    klass.featureChoices ??= [];
    for (const [level, spellLevel] of [
      [11, 6],
      [13, 7],
      [15, 8],
      [17, 9],
    ]) {
      const id = `warlock-mystic-arcanum-${spellLevel}`;
      if (!klass.featureChoices.some((choice) => choice.id === id))
        klass.featureChoices.push(
          spellChoice(
            id,
            `Arcanum Mistico di ${spellLevel}° livello`,
            `Scegli un incantesimo da Warlock di ${spellLevel}° livello.`,
            level,
            1,
            spells
              .filter((spell) => spell.level === spellLevel && spell.classes.includes('warlock'))
              .map((spell) => ({
                id: spell.id,
                name: spell.name,
                description: `${spell.school} · ${spellLevel}° livello.`,
              })),
            { effect: 'spell-grant' },
          ),
        );
    }
  }
  if (klass.id === 'wizard') {
    klass.featureChoices ??= [];
    const wizardSpells = (level) =>
      spells
        .filter((spell) => spell.level === level && spell.classes.includes('wizard'))
        .map((spell) => ({
          id: spell.id,
          name: spell.name,
          description: `${spell.school} · ${level}° livello.`,
        }));
    const wizardChoices = [
      spellChoice(
        'wizard-spell-mastery-1',
        'Maestria negli Incantesimi: 1° livello',
        'Scegli un incantesimo da Mago di 1° livello già conosciuto.',
        18,
        1,
        wizardSpells(1),
        {},
      ),
      spellChoice(
        'wizard-spell-mastery-2',
        'Maestria negli Incantesimi: 2° livello',
        'Scegli un incantesimo da Mago di 2° livello già conosciuto.',
        18,
        1,
        wizardSpells(2),
        {},
      ),
      spellChoice(
        'wizard-signature-spells',
        'Incantesimi Personali',
        'Scegli due incantesimi da Mago di 3° livello già conosciuti.',
        20,
        2,
        wizardSpells(3),
        {},
      ),
    ];
    for (const choice of wizardChoices) {
      const existing = klass.featureChoices.find((candidate) => candidate.id === choice.id);
      if (existing) {
        delete existing.requiresKnownSpell;
        Object.assign(existing, choice);
      } else klass.featureChoices.push(choice);
    }
  }
}

await writeFile(classesPath, `${JSON.stringify(classes, null, 2)}\n`);
