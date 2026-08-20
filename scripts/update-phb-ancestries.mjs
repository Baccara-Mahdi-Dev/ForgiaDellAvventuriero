import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../public/data/v1/', import.meta.url);
const source = 'PHB';
const allSkills = [
  'acrobatics',
  'animal-handling',
  'arcana',
  'athletics',
  'stealth',
  'investigation',
  'deception',
  'intimidation',
  'insight',
  'medicine',
  'nature',
  'perception',
  'persuasion',
  'sleight-of-hand',
  'religion',
  'survival',
  'history',
  'performance',
];
const artisanTools = ['Strumenti da fabbro', 'Scorte da birraio', 'Strumenti da muratore'];
const detail = (name, effect) => ({ name, effect });
const darkvision = (meters = 18) =>
  detail(
    'Scurovisione',
    `Vedi nell'oscurità entro ${meters} m come in luce fioca; nell'oscurità distingui solo tonalità di grigio.`,
  );
const fey = detail(
  'Retaggio fatato',
  "Hai vantaggio ai tiri salvezza contro l'essere affascinato e la magia non può farti addormentare.",
);
const trance = detail(
  'Trance',
  'Mediti profondamente per 4 ore al giorno e ne ricavi gli stessi benefici di 8 ore di sonno.',
);
const dwarfCommon = [
  darkvision(),
  detail('Velocità nanica', "La velocità di 7,5 m non viene ridotta dall'armatura pesante."),
  detail(
    'Resilienza nanica',
    'Hai vantaggio ai tiri salvezza contro il veleno e resistenza ai danni da veleno.',
  ),
  detail(
    'Addestramento da combattimento nanico',
    'Hai competenza in ascia da battaglia, accetta, martello leggero e martello da guerra.',
  ),
  detail(
    'Competenza negli strumenti',
    'Scegli una competenza tra strumenti da fabbro, scorte da birraio o strumenti da muratore.',
  ),
  detail(
    'Esperto minatore',
    'Nelle prove di Intelligenza (Storia) legate alla pietra aggiungi due volte il bonus di competenza.',
  ),
];
const elfCommon = [
  darkvision(),
  detail('Sensi acuti', "Ottieni competenza nell'abilità Percezione."),
  fey,
  trance,
];
const halflingCommon = [
  detail(
    'Fortunato',
    'Quando ottieni 1 naturale a un tiro per colpire, prova di caratteristica o tiro salvezza, puoi ritirare il dado e devi usare il nuovo risultato.',
  ),
  detail('Coraggioso', "Hai vantaggio ai tiri salvezza contro l'essere spaventato."),
  detail(
    'Agilità halfling',
    'Puoi attraversare lo spazio di una creatura di taglia superiore alla tua.',
  ),
];
const ancestry = (
  id,
  name,
  race,
  description,
  bonuses,
  speed,
  traits,
  traitDetails,
  extra = {},
) => ({
  id,
  name,
  race,
  description,
  source,
  bonuses,
  speed,
  ...extra,
  traits,
  traitDetails,
});

const humans = [
  ancestry(
    'human',
    'Umano',
    'Umano',
    'Versatile e ambizioso, adatto a ogni cammino.',
    { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    9,
    ['Versatilità umana'],
    [detail('Versatilità umana', 'Tutte le sei caratteristiche aumentano di 1.')],
    { size: 'Media', languages: ['Comune'], languageChoices: 1 },
  ),
  ancestry(
    'human-variant',
    'Umano · Variante',
    'Umano',
    'Un umano specializzato con un talento e una competenza fin dal 1° livello.',
    {},
    9,
    ['Due caratteristiche +1', 'Talento bonus', 'Competenza versatile'],
    [
      detail('Caratteristiche versatili', 'Due caratteristiche diverse a scelta aumentano di 1.'),
      detail(
        'Talento bonus',
        'Ottieni un talento al 1° livello; non consuma una scelta ASI di classe.',
      ),
      detail('Competenza versatile', "Ottieni competenza in un'abilità a scelta."),
    ],
    {
      size: 'Media',
      flexibleBonusCount: 2,
      flexibleBonusOptions: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
      skillChoices: 1,
      skillChoiceOptions: allSkills,
      bonusFeat: true,
      languages: ['Comune'],
      languageChoices: 1,
    },
  ),
];

const dwarves = [
  ancestry(
    'dwarf-hill',
    'Nano · Collina',
    'Nano',
    'Tenace e saggio, con una resistenza eccezionale.',
    { con: 2, wis: 1 },
    7.5,
    ['Resilienza nanica', 'Tenacia nanica'],
    [
      ...dwarfCommon,
      detail(
        'Tenacia nanica',
        'I punti ferita massimi aumentano di 1 al 1° livello e di un ulteriore punto a ogni livello successivo.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      resistances: ['Veleno'],
      hitPointsPerLevel: 1,
      weaponProficiencies: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'],
      toolChoices: 1,
      toolOptions: artisanTools,
      languages: ['Comune', 'Nanico'],
    },
  ),
  ancestry(
    'dwarf-mountain',
    'Nano · Montagna',
    'Nano',
    'Forte e abituato alla vita in armatura.',
    { con: 2, str: 2 },
    7.5,
    ['Resilienza nanica', 'Addestramento nelle armature'],
    [
      ...dwarfCommon,
      detail(
        'Addestramento nelle armature naniche',
        'Hai competenza nelle armature leggere e medie.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      resistances: ['Veleno'],
      weaponProficiencies: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'],
      armorProficiencies: ['light', 'medium'],
      toolChoices: 1,
      toolOptions: artisanTools,
      languages: ['Comune', 'Nanico'],
    },
  ),
];

const elves = [
  ancestry(
    'elf-high',
    'Elfo · Alto',
    'Elfo',
    'Grazia elfica e tradizione arcana.',
    { dex: 2, int: 1 },
    9,
    ['Sensi acuti', 'Retaggio fatato', 'Trucchetto'],
    [
      ...elfCommon,
      detail(
        'Addestramento nelle armi elfiche',
        'Hai competenza in spada lunga, spada corta, arco corto e arco lungo.',
      ),
      detail(
        'Trucchetto',
        'Scegli un trucchetto da Mago. Intelligenza è la caratteristica da incantatore e il trucchetto non conta tra quelli di classe.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      skillProficiencies: ['perception'],
      weaponProficiencies: ['longsword', 'shortsword', 'shortbow', 'longbow'],
      spellChoices: [
        {
          id: 'high-elf-cantrip',
          label: 'Trucchetto da Mago',
          count: 1,
          level: 0,
          classes: ['wizard'],
        },
      ],
      languages: ['Comune', 'Elfico'],
      languageChoices: 1,
    },
  ),
  ancestry(
    'elf-wood',
    'Elfo · Boschi',
    'Elfo',
    'Rapido, percettivo e capace di confondersi nella natura.',
    { dex: 2, wis: 1 },
    10.5,
    ['Sensi acuti', 'Piede veloce', 'Maschera della selva'],
    [
      ...elfCommon,
      detail(
        'Addestramento nelle armi elfiche',
        'Hai competenza in spada lunga, spada corta, arco corto e arco lungo.',
      ),
      detail('Piede veloce', 'La tua velocità base è 10,5 m.'),
      detail(
        'Maschera della selva',
        'Puoi tentare di nasconderti quando sei oscurato leggermente da fenomeni naturali.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      skillProficiencies: ['perception'],
      weaponProficiencies: ['longsword', 'shortsword', 'shortbow', 'longbow'],
      languages: ['Comune', 'Elfico'],
    },
  ),
  ancestry(
    'elf-drow',
    'Elfo · Drow',
    'Elfo',
    'Retaggio del Sottosuolo, sensi superiori e magia innata.',
    { dex: 2, cha: 1 },
    9,
    ['Scurovisione superiore', 'Sensibilità alla luce', 'Magia drow'],
    [
      darkvision(36),
      detail('Sensi acuti', "Ottieni competenza nell'abilità Percezione."),
      fey,
      trance,
      detail(
        'Sensibilità alla luce solare',
        'Alla luce solare diretta hai svantaggio ai tiri per colpire e alle prove di Percezione basate sulla vista.',
      ),
      detail(
        'Magia drow',
        'Conosci Luci Danzanti. Dal 3° livello lanci Luminescenza e dal 5° Oscurità una volta per riposo lungo; Carisma è la caratteristica da incantatore.',
      ),
      detail(
        'Addestramento nelle armi drow',
        'Hai competenza in stocco, spada corta e balestra a mano.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 36,
      skillProficiencies: ['perception'],
      weaponProficiencies: ['rapier', 'shortsword', 'hand-crossbow'],
      spellGrants: [
        { spellId: 'dancing-lights', minLevel: 1 },
        { spellId: 'faerie-fire', minLevel: 3, note: 'Una volta per riposo lungo' },
        { spellId: 'darkness', minLevel: 5, note: 'Una volta per riposo lungo' },
      ],
      languages: ['Comune', 'Elfico'],
    },
  ),
];

const halflings = [
  ancestry(
    'halfling-lightfoot',
    'Halfling · Piedelesto',
    'Halfling',
    'Agile, socievole e naturalmente furtivo.',
    { dex: 2, cha: 1 },
    7.5,
    ['Fortunato', 'Coraggioso', 'Furtività naturale'],
    [
      ...halflingCommon,
      detail(
        'Furtività naturale',
        'Puoi tentare di nasconderti quando sei oscurato soltanto da una creatura di almeno una taglia più grande.',
      ),
    ],
    { size: 'Piccola', languages: ['Comune', 'Halfling'] },
  ),
  ancestry(
    'halfling-stout',
    'Halfling · Tozzo',
    'Halfling',
    'Robusto e resistente alle tossine.',
    { dex: 2, con: 1 },
    7.5,
    ['Fortunato', 'Coraggioso', 'Resilienza dei tozzi'],
    [
      ...halflingCommon,
      detail(
        'Resilienza dei tozzi',
        'Hai vantaggio ai tiri salvezza contro il veleno e resistenza ai danni da veleno.',
      ),
    ],
    { size: 'Piccola', resistances: ['Veleno'], languages: ['Comune', 'Halfling'] },
  ),
];

const breathData = [
  ['black', 'Nero', 'Acido', 'linea di 9 m per 1,5 m', 'Destrezza'],
  ['blue', 'Blu', 'Fulmine', 'linea di 9 m per 1,5 m', 'Destrezza'],
  ['brass', 'Ottone', 'Fuoco', 'linea di 9 m per 1,5 m', 'Destrezza'],
  ['bronze', 'Bronzo', 'Fulmine', 'linea di 9 m per 1,5 m', 'Destrezza'],
  ['copper', 'Rame', 'Acido', 'linea di 9 m per 1,5 m', 'Destrezza'],
  ['gold', 'Dorato', 'Fuoco', 'cono di 4,5 m', 'Destrezza'],
  ['green', 'Verde', 'Veleno', 'cono di 4,5 m', 'Costituzione'],
  ['red', 'Rosso', 'Fuoco', 'cono di 4,5 m', 'Destrezza'],
  ['silver', 'Argento', 'Freddo', 'cono di 4,5 m', 'Costituzione'],
  ['white', 'Bianco', 'Freddo', 'cono di 4,5 m', 'Costituzione'],
];
const dragonborn = breathData.map(([id, color, damage, area, save]) =>
  ancestry(
    `dragonborn-${id}`,
    `Dragonide · ${color}`,
    'Dragonide',
    `Discendenza draconica legata ai danni da ${damage.toLowerCase()}.`,
    { str: 2, cha: 1 },
    9,
    [`Resistenza: ${damage}`, `Soffio: ${damage}`],
    [
      detail('Resistenza draconica', `Hai resistenza ai danni da ${damage.toLowerCase()}.`),
      detail(
        `Soffio di ${damage.toLowerCase()}`,
        `Con un'azione emetti una ${area}. Le creature effettuano un TS ${save} con CD 8 + bonus di competenza + modificatore di Costituzione; subiscono 2d6 danni da ${damage.toLowerCase()}, dimezzati con successo. I danni diventano 3d6 al 6°, 4d6 all'11° e 5d6 al 16°. Recuperi il soffio dopo un riposo breve o lungo.`,
      ),
    ],
    { size: 'Media', resistances: [damage], languages: ['Comune', 'Draconico'] },
  ),
);

const gnomes = [
  ancestry(
    'gnome-forest',
    'Gnomo · Foresta',
    'Gnomo',
    'Agile, illusorio e in sintonia con i piccoli animali.',
    { int: 2, dex: 1 },
    7.5,
    ['Astuzia gnomesca', 'Illusionista naturale', 'Parlare con piccole bestie'],
    [
      darkvision(),
      detail(
        'Astuzia gnomesca',
        'Hai vantaggio ai tiri salvezza di Intelligenza, Saggezza e Carisma contro la magia.',
      ),
      detail(
        'Illusionista naturale',
        'Conosci Illusione Minore; Intelligenza è la caratteristica da incantatore.',
      ),
      detail(
        'Parlare con piccole bestie',
        'Con suoni e gesti puoi comunicare idee semplici alle bestie di taglia Piccola o inferiore.',
      ),
    ],
    {
      size: 'Piccola',
      darkvisionMeters: 18,
      spellGrants: [{ spellId: 'minor-illusion', minLevel: 1 }],
      languages: ['Comune', 'Gnomesco'],
    },
  ),
  ancestry(
    'gnome-rock',
    'Gnomo · Rocce',
    'Gnomo',
    'Inventivo, robusto e versato nei congegni.',
    { int: 2, con: 1 },
    7.5,
    ['Astuzia gnomesca', 'Sapienza artefice', 'Inventore'],
    [
      darkvision(),
      detail(
        'Astuzia gnomesca',
        'Hai vantaggio ai tiri salvezza di Intelligenza, Saggezza e Carisma contro la magia.',
      ),
      detail(
        'Sapienza artefice',
        'Nelle prove di Storia relative a oggetti magici, alchemici o tecnologici aggiungi due volte il bonus di competenza.',
      ),
      detail(
        'Inventore',
        'Sei competente negli strumenti da inventore e puoi costruire un piccolo congegno a orologeria durante 1 ora di lavoro.',
      ),
    ],
    {
      size: 'Piccola',
      darkvisionMeters: 18,
      tools: ['Strumenti da inventore'],
      languages: ['Comune', 'Gnomesco'],
    },
  ),
];

const other = [
  ancestry(
    'half-elf',
    'Mezzelfo',
    'Mezzelfo',
    'Versatile, carismatico e dotato dei sensi del retaggio elfico.',
    { cha: 2 },
    9,
    ['Scurovisione', 'Retaggio fatato', 'Versatilità nelle abilità'],
    [
      darkvision(),
      fey,
      detail('Versatilità nelle abilità', 'Ottieni competenza in due abilità a scelta.'),
      detail('Caratteristiche versatili', 'Due caratteristiche diverse da Carisma aumentano di 1.'),
    ],
    {
      size: 'Media',
      flexibleBonusCount: 2,
      flexibleBonusOptions: ['str', 'dex', 'con', 'int', 'wis'],
      skillChoices: 2,
      skillChoiceOptions: allSkills,
      languages: ['Comune', 'Elfico'],
      languageChoices: 1,
    },
  ),
  ancestry(
    'half-orc',
    'Mezzorco',
    'Mezzorco',
    'Forte, tenace e difficile da abbattere.',
    { str: 2, con: 1 },
    9,
    ['Minaccioso', 'Tenacia implacabile', 'Attacchi selvaggi'],
    [
      darkvision(),
      detail('Minaccioso', "Ottieni competenza nell'abilità Intimidire."),
      detail(
        'Tenacia implacabile',
        'Quando scendi a 0 PF senza morire sul colpo, puoi restare a 1 PF. Recuperi questo tratto dopo un riposo lungo.',
      ),
      detail(
        'Attacchi selvaggi',
        'Quando realizzi un colpo critico con un attacco con arma da mischia, tiri una volta in più uno dei dadi di danno dell’arma.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      skillProficiencies: ['intimidation'],
      languages: ['Comune', 'Orchesco'],
    },
  ),
  ancestry(
    'tiefling',
    'Tiefling',
    'Tiefling',
    'Retaggio infernale, ingegno e presenza magnetica.',
    { int: 1, cha: 2 },
    9,
    ['Scurovisione', 'Resistenza infernale', 'Eredità infernale'],
    [
      darkvision(),
      detail('Resistenza infernale', 'Hai resistenza ai danni da fuoco.'),
      detail(
        'Eredità infernale',
        'Conosci Taumaturgia. Dal 3° livello lanci Punizione Infernale come incantesimo di 2° livello e dal 5° Oscurità, una volta per riposo lungo; Carisma è la caratteristica da incantatore.',
      ),
    ],
    {
      size: 'Media',
      darkvisionMeters: 18,
      resistances: ['Fuoco'],
      spellGrants: [
        { spellId: 'thaumaturgy', minLevel: 1 },
        {
          spellId: 'hellish-rebuke',
          minLevel: 3,
          note: 'Come incantesimo di 2° livello, una volta per riposo lungo',
        },
        { spellId: 'darkness', minLevel: 5, note: 'Una volta per riposo lungo' },
      ],
      languages: ['Comune', 'Infernale'],
    },
  ),
];

const current = JSON.parse(await readFile(new URL('ancestries.json', root), 'utf8'));
const nonPhb = current.filter((item) => item.source !== 'PHB');
const records = [
  ...humans,
  ...dwarves,
  ...elves,
  ...halflings,
  ...dragonborn,
  ...gnomes,
  ...other,
  ...nonPhb,
];
await writeFile(new URL('ancestries.json', root), `${JSON.stringify(records, null, 2)}\n`, 'utf8');

const manifestUrl = new URL('manifest.json', root);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
manifest.dataVersion = '1.9.0';
manifest.catalog.ancestries = records.length;
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(
  `Razze aggiornate: ${records.length} opzioni (${records.filter((x) => x.source === 'PHB').length} PHB).`,
);
