import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/data/v1/spells.json';
const spells = JSON.parse(readFileSync(path, 'utf8'));

const alwaysPrepared = 'Sempre preparato; non conta nel limite degli incantesimi preparati.';
const alwaysKnown = 'Sempre conosciuto; non conta nel limite degli incantesimi conosciuti.';

const progressions = [
  [
    'cleric',
    'Dominio della Conoscenza',
    alwaysPrepared,
    '1:command,identify;3:augury,suggestion;5:nondetection,speak-with-dead;7:arcane-eye,confusion;9:legend-lore,scrying',
  ],
  [
    'cleric',
    'Dominio della Vita',
    alwaysPrepared,
    '1:bless,cure-wounds;3:lesser-restoration,spiritual-weapon;5:beacon-of-hope,revivify;7:death-ward,guardian-of-faith;9:mass-cure-wounds,raise-dead',
  ],
  [
    'cleric',
    'Dominio della Luce',
    alwaysPrepared,
    '1:burning-hands,faerie-fire;3:flaming-sphere,scorching-ray;5:daylight,fireball;7:guardian-of-faith,wall-of-fire;9:flame-strike,scrying',
  ],
  [
    'cleric',
    'Dominio della Natura',
    alwaysPrepared,
    '1:animal-friendship,speak-with-animals;3:barkskin,spike-growth;5:plant-growth,wind-wall;7:dominate-beast,grasping-vine;9:insect-plague,tree-stride',
  ],
  [
    'cleric',
    'Dominio della Tempesta',
    alwaysPrepared,
    '1:fog-cloud,thunderwave;3:gust-of-wind,shatter;5:call-lightning,sleet-storm;7:control-water,ice-storm;9:destructive-wave,insect-plague',
  ],
  [
    'cleric',
    "Dominio dell'Inganno",
    alwaysPrepared,
    '1:charm-person,disguise-self;3:mirror-image,pass-without-trace;5:blink,dispel-magic;7:dimension-door,polymorph;9:dominate-person,modify-memory',
  ],
  [
    'cleric',
    'Dominio della Guerra',
    alwaysPrepared,
    '1:divine-favor,shield-of-faith;3:magic-weapon,spiritual-weapon;5:crusaders-mantle,spirit-guardians;7:freedom-of-movement,stoneskin;9:flame-strike,hold-monster',
  ],
  [
    'cleric',
    'Dominio della Forgia',
    alwaysPrepared,
    '1:identify,searing-smite;3:heat-metal,magic-weapon;5:elemental-weapon,protection-from-energy;7:fabricate,wall-of-fire;9:animate-objects,creation',
  ],
  [
    'cleric',
    'Dominio della Sepoltura',
    alwaysPrepared,
    '1:bane,false-life;3:gentle-repose,ray-of-enfeeblement;5:revivify,vampiric-touch;7:blight,death-ward;9:antilife-shell,raise-dead',
  ],
  [
    'cleric',
    "Dominio dell'Ordine",
    alwaysPrepared,
    '1:command,heroism;3:hold-person,zone-of-truth;5:mass-healing-word,slow;7:compulsion,locate-creature;9:commune,dominate-person',
  ],
  [
    'cleric',
    'Dominio della Pace',
    alwaysPrepared,
    '1:heroism,sanctuary;3:aid,warding-bond;5:beacon-of-hope,sending;7:aura-of-purity,resilient-sphere;9:greater-restoration,telepathic-bond',
  ],
  [
    'cleric',
    'Dominio del Crepuscolo',
    alwaysPrepared,
    '1:faerie-fire,sleep;3:moonbeam,see-invisibility;5:aura-of-vitality,tiny-hut;7:aura-of-life,greater-invisibility;9:circle-of-power,mislead',
  ],
  [
    'paladin',
    'Giuramento di Devozione',
    alwaysPrepared,
    '3:protection-from-evil-and-good,sanctuary;5:lesser-restoration,zone-of-truth;9:beacon-of-hope,dispel-magic;13:freedom-of-movement,guardian-of-faith;17:commune,flame-strike',
  ],
  [
    'paladin',
    'Giuramento degli Antichi',
    alwaysPrepared,
    '3:ensnaring-strike,speak-with-animals;5:moonbeam,misty-step;9:plant-growth,protection-from-energy;13:ice-storm,stoneskin;17:commune-with-nature,tree-stride',
  ],
  [
    'paladin',
    'Giuramento di Vendetta',
    alwaysPrepared,
    '3:bane,hunters-mark;5:hold-person,misty-step;9:haste,protection-from-energy;13:banishment,dimension-door;17:hold-monster,scrying',
  ],
  [
    'paladin',
    'Giuramento di Conquista',
    alwaysPrepared,
    '3:armor-of-agathys,command;5:hold-person,spiritual-weapon;9:bestow-curse,fear;13:dominate-beast,stoneskin;17:cloudkill,dominate-person',
  ],
  [
    'paladin',
    'Giuramento di Redenzione',
    alwaysPrepared,
    '3:sanctuary,sleep;5:calm-emotions,hold-person;9:counterspell,hypnotic-pattern;13:resilient-sphere,stoneskin;17:hold-monster,wall-of-force',
  ],
  [
    'paladin',
    'Giuramento di Gloria',
    alwaysPrepared,
    '3:guiding-bolt,heroism;5:enhance-ability,magic-weapon;9:haste,protection-from-energy;13:compulsion,freedom-of-movement;17:commune,flame-strike',
  ],
  [
    'paladin',
    'Giuramento dei Guardiani',
    alwaysPrepared,
    '3:alarm,detect-magic;5:moonbeam,see-invisibility;9:counterspell,nondetection;13:aura-of-purity,banishment;17:hold-monster,scrying',
  ],
  [
    'ranger',
    'Cacciatore delle Tenebre',
    alwaysKnown,
    '3:disguise-self;5:rope-trick;9:fear;13:greater-invisibility;17:seeming',
  ],
  [
    'ranger',
    "Viandante dell'Orizzonte",
    alwaysKnown,
    '3:protection-from-evil-and-good;5:misty-step;9:haste;13:banishment;17:teleportation-circle',
  ],
  [
    'ranger',
    'Uccisore di Mostri',
    alwaysKnown,
    '3:protection-from-evil-and-good;5:zone-of-truth;9:magic-circle;13:banishment;17:hold-monster',
  ],
  [
    'ranger',
    'Viandante Fatato',
    alwaysKnown,
    '3:charm-person;5:misty-step;9:dispel-magic;13:dimension-door;17:mislead',
  ],
  [
    'ranger',
    'Custode degli Sciami',
    alwaysKnown,
    '3:faerie-fire,mage-hand;5:web;9:gaseous-form;13:arcane-eye;17:insect-plague',
  ],
  ['druid', 'Circolo delle Spore', alwaysKnown, '2:chill-touch'],
  [
    'druid',
    'Circolo delle Spore',
    alwaysPrepared,
    '3:blindness-deafness,gentle-repose;5:animate-dead,gaseous-form;7:blight,confusion;9:cloudkill,contagion',
  ],
  ['druid', 'Circolo delle Stelle', alwaysPrepared, '2:guiding-bolt'],
  [
    'druid',
    'Circolo del Fuoco Selvaggio',
    alwaysPrepared,
    '2:burning-hands,cure-wounds;3:flaming-sphere,scorching-ray;5:plant-growth,revivify;7:aura-of-life,fire-shield;9:flame-strike,mass-cure-wounds',
  ],
  [
    'sorcerer',
    'Mente Aberrante',
    alwaysKnown,
    '1:arms-of-hadar,dissonant-whispers,mind-sliver;3:calm-emotions,detect-thoughts;5:hunger-of-hadar,sending;7:black-tentacles,summon-aberration;9:telekinesis,telepathic-bond',
  ],
  [
    'sorcerer',
    'Anima Meccanica',
    alwaysKnown,
    '1:alarm,protection-from-evil-and-good;3:aid,lesser-restoration;5:dispel-magic,protection-from-energy;7:freedom-of-movement,summon-construct;9:greater-restoration,wall-of-force',
  ],
  ['artificer', 'Artigliere', alwaysPrepared, '5:scorching-ray'],
];

const byId = new Map(spells.map((spell) => [spell.id, spell]));
const generatedKeys = new Set();

for (const [classId, subclassId, note, encoded] of progressions) {
  for (const tier of encoded.split(';')) {
    const [levelText, idsText] = tier.split(':');
    for (const spellId of idsText.split(',')) {
      const spell = byId.get(spellId);
      if (!spell) throw new Error(`Incantesimo non trovato nel catalogo: ${spellId}`);
      const grant = { classId, subclassId, minLevel: Number(levelText), note };
      const key = `${spellId}|${classId}|${subclassId}`;
      generatedKeys.add(key);
      spell.subclassGrants ??= [];
      const existing = spell.subclassGrants.find(
        (item) => item.classId === classId && item.subclassId === subclassId,
      );
      if (existing) Object.assign(existing, grant);
      else spell.subclassGrants.push(grant);
    }
  }
}

for (const spell of spells) {
  if (!spell.subclassGrants) continue;
  spell.subclassGrants.sort((a, b) =>
    `${a.classId}|${a.subclassId}|${a.minLevel}`.localeCompare(
      `${b.classId}|${b.subclassId}|${b.minLevel}`,
    ),
  );
}

writeFileSync(path, `${JSON.stringify(spells, null, 2)}\n`, 'utf8');
console.log(`Verified and merged ${generatedKeys.size} fixed subclass spell grants.`);
