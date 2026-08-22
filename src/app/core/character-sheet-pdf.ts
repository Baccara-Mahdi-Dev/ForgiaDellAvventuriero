import { PDFCheckBox, PDFDocument, PDFFont, PDFForm, PDFTextField, StandardFonts } from 'pdf-lib';
import { CatalogData } from '../domain/catalog';
import {
  AbilityKey,
  CharacterDraft,
  DerivedCharacter,
  EquipmentItem,
  Spell,
} from '../domain/models';
import { derive, spellSlots } from '../domain/rules';
import { asSpell } from '../domain/homebrew-spell';
import { damageForHands, equippedWeaponItems, hasTwoWeaponFighting } from '../domain/weapon-loadout';

const ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ALIGNMENTS: Record<string, string> = {
  'lawful-good': 'Legale Buono',
  'neutral-good': 'Neutrale Buono',
  'chaotic-good': 'Caotico Buono',
  'lawful-neutral': 'Legale Neutrale',
  'true-neutral': 'Neutrale Puro',
  'chaotic-neutral': 'Caotico Neutrale',
  'lawful-evil': 'Legale Malvagio',
  'neutral-evil': 'Neutrale Malvagio',
  'chaotic-evil': 'Caotico Malvagio',
  unaligned: 'Senza allineamento',
};
const SAVE_FIELDS: Record<AbilityKey, [string, string]> = {
  str: ['ST Strength', 'STRprof'],
  dex: ['ST Dexterity', 'DEXprof'],
  con: ['ST Constitution', 'CONprof'],
  int: ['ST Intelligence', 'INTprof'],
  wis: ['ST Wisdom', 'WISprof'],
  cha: ['ST Charisma', 'CHAprof'],
};
const SKILL_FIELDS: Record<string, [string, string]> = {
  acrobatics: ['ACRO', 'ACROP'],
  'animal-handling': ['ANIM', 'ANIMP'],
  arcana: ['ARC', 'ARCP'],
  athletics: ['ATH', 'ATHP'],
  stealth: ['STLTH', 'STLTHP'],
  investigation: ['INV', 'INVP'],
  deception: ['DEC', 'DECP'],
  intimidation: ['INTI', 'INTIP'],
  performance: ['PERF', 'PERFP'],
  insight: ['INS', 'INSP'],
  medicine: ['MED', 'MEDP'],
  nature: ['NAT', 'NATP'],
  perception: ['PERC', 'PERCP'],
  persuasion: ['PERS', 'PERSP'],
  'sleight-of-hand': ['SLE', 'SLEP'],
  religion: ['REL', 'RELP'],
  survival: ['SURV', 'SURVP'],
  history: ['HIST', 'HISTP'],
};
const DEATH_SUCCESSES = ['Check Box 12', 'Check Box 13', 'Check Box 14'];
const DEATH_FAILURES = ['Check Box 15', 'Check Box 16', 'Check Box 17'];
const INSPIRATION_FIELDS = ['insp1', 'insp2', 'insp3', 'insp4'];
const SPELL_FIELDS: Record<number, string[]> = {
  0: [
    'Spells 1014',
    'Spells 1016',
    'Spells 1017',
    'Spells 1018',
    'Spells 1019',
    'Spells 1020',
    'Spells 1021',
    'Spells 1022',
  ],
  1: [
    'Spells 101014',
    'Spells 1015',
    'Spells 1023',
    'Spells 1024',
    'Spells 1025',
    'Spells 1026',
    'Spells 1027',
    'Spells 1028',
    'Spells 1029',
    'Spells 1030',
    'Spells 1031',
    'Spells 1032',
    'Spells 1033',
  ],
  2: [
    'Spells 1046',
    'Spells 1034',
    'Spells 1035',
    'Spells 1036',
    'Spells 1037',
    'Spells 1038',
    'Spells 1039',
    'Spells 1040',
    'Spells 1041',
    'Spells 1042',
    'Spells 1043',
    'Spells 1044',
    'Spells 1045',
  ],
  3: [
    'Spells 1048',
    'Spells 1047',
    'Spells 1049',
    'Spells 1050',
    'Spells 1051',
    'Spells 1052',
    'Spells 1053',
    'Spells 1054',
    'Spells 1055',
    'Spells 1056',
    'Spells 1057',
    'Spells 1058',
    'Spells 1059',
  ],
  4: [
    'Spells 1061',
    'Spells 1060',
    'Spells 1062',
    'Spells 1063',
    'Spells 1064',
    'Spells 1065',
    'Spells 1066',
    'Spells 1067',
    'Spells 1068',
    'Spells 1069',
    'Spells 1070',
    'Spells 1071',
    'Spells 1072',
  ],
  5: [
    'Spells 1074',
    'Spells 1073',
    'Spells 1075',
    'Spells 1076',
    'Spells 1077',
    'Spells 1078',
    'Spells 1079',
    'Spells 1080',
    'Spells 1081',
  ],
  6: [
    'Spells 1083',
    'Spells 1082',
    'Spells 1084',
    'Spells 1085',
    'Spells 1086',
    'Spells 1087',
    'Spells 1088',
    'Spells 1089',
    'Spells 1090',
  ],
  7: [
    'Spells 1092',
    'Spells 1091',
    'Spells 1093',
    'Spells 1094',
    'Spells 1095',
    'Spells 1096',
    'Spells 1097',
    'Spells 1098',
    'Spells 1099',
  ],
  8: [
    'Spells 10101',
    'Spells 10100',
    'Spells 10102',
    'Spells 10103',
    'Spells 10104',
    'Spells 10105',
    'Spells 10106',
  ],
  9: [
    'Spells 10108',
    'Spells 10107',
    'Spells 10109',
    'Spells 101010',
    'Spells 101011',
    'Spells 101012',
    'Spells 101013',
  ],
};
const SPELL_CHECKBOXES: Record<number, string[]> = {
  1: [
    'Check Box 2510',
    'Check Box 251',
    'Check Box 309',
    'Check Box 3010',
    'Check Box 3011',
    'Check Box 3012',
    'Check Box 3013',
    'Check Box 3014',
    'Check Box 3015',
    'Check Box 3016',
    'Check Box 3017',
    'Check Box 3018',
    'Check Box 3019',
  ],
  2: [
    'Check Box 313',
    'Check Box 310',
    'Check Box 3020',
    'Check Box 3021',
    'Check Box 3022',
    'Check Box 3023',
    'Check Box 3024',
    'Check Box 3025',
    'Check Box 3026',
    'Check Box 3027',
    'Check Box 3028',
    'Check Box 3029',
    'Check Box 3030',
  ],
  3: [
    'Check Box 315',
    'Check Box 314',
    'Check Box 3031',
    'Check Box 3032',
    'Check Box 3033',
    'Check Box 3034',
    'Check Box 3035',
    'Check Box 3036',
    'Check Box 3037',
    'Check Box 3038',
    'Check Box 3039',
    'Check Box 3040',
    'Check Box 3041',
  ],
  4: [
    'Check Box 317',
    'Check Box 316',
    'Check Box 3042',
    'Check Box 3043',
    'Check Box 3044',
    'Check Box 3045',
    'Check Box 3046',
    'Check Box 3047',
    'Check Box 3048',
    'Check Box 3049',
    'Check Box 3050',
    'Check Box 3051',
    'Check Box 3052',
  ],
  5: [
    'Check Box 319',
    'Check Box 318',
    'Check Box 3053',
    'Check Box 3054',
    'Check Box 3055',
    'Check Box 3056',
    'Check Box 3057',
    'Check Box 3058',
    'Check Box 3059',
  ],
  6: [
    'Check Box 321',
    'Check Box 320',
    'Check Box 3060',
    'Check Box 3061',
    'Check Box 3062',
    'Check Box 3063',
    'Check Box 3064',
    'Check Box 3065',
    'Check Box 3066',
  ],
  7: [
    'Check Box 323',
    'Check Box 322',
    'Check Box 3067',
    'Check Box 3068',
    'Check Box 3069',
    'Check Box 3070',
    'Check Box 3071',
    'Check Box 3072',
    'Check Box 3073',
  ],
  8: [
    'Check Box 325',
    'Check Box 324',
    'Check Box 3074',
    'Check Box 3075',
    'Check Box 3076',
    'Check Box 3077',
    'Check Box 3078',
  ],
  9: [
    'Check Box 327',
    'Check Box 326',
    'Check Box 3079',
    'Check Box 3080',
    'Check Box 3081',
    'Check Box 3082',
    'Check Box 3083',
  ],
};
const SLOT_FIELDS: Record<number, [string, string]> = {
  1: ['SlotsTotal 19', 'SlotsRemaining 19'],
  2: ['SlotsTotal 20', 'SlotsRemaining 20'],
  3: ['SlotsTotal 21', 'SlotsRemaining 21'],
  4: ['SlotsTotal 22', 'SlotsRemaining 22'],
  5: ['SlotsTotal 23', 'SlotsRemaining 23'],
  6: ['SlotsTotal 24', 'SlotsRemaining 24'],
  7: ['SlotsTotal 25', 'SlotsRemaining 25'],
  8: ['SlotsTotal 26', 'SlotsRemaining 26'],
  9: ['SlotsTotal 27', 'SlotsRemaining 27'],
};

const clean = (value: unknown, multiline = false): string => {
  const normalized = String(value ?? '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00d7/g, 'x')
    .replace(/[\u2190-\u21ff]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '-');
  if (!multiline) return normalized.replace(/\s+/g, ' ').trim();
  return normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
};
const signed = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;

function getTextField(form: PDFForm, name: string): PDFTextField | undefined {
  try {
    return form.getTextField(name);
  } catch {
    return undefined;
  }
}
function getCheckBox(form: PDFForm, name: string): PDFCheckBox | undefined {
  try {
    return form.getCheckBox(name);
  } catch {
    return undefined;
  }
}
function setText(
  form: PDFForm,
  name: string,
  value: unknown,
  options: { multiline?: boolean; fontSize?: number } = {},
): void {
  const field = getTextField(form, name);
  if (!field) return;
  if (options.multiline) field.enableMultiline();
  if (options.fontSize) {
    field.acroField.setDefaultAppearance(`/Helv ${options.fontSize} Tf 0 g`);
    field.setFontSize(options.fontSize);
  }
  field.setText(clean(value, options.multiline));
}
function setChecked(form: PDFForm, name: string, checked: boolean): void {
  const field = getCheckBox(form, name);
  if (field && checked) field.check();
}
function weaponModifier(item: EquipmentItem, derived: DerivedCharacter): number {
  return item.ranged
    ? derived.modifiers.dex
    : item.finesse
      ? Math.max(derived.modifiers.str, derived.modifiers.dex)
      : derived.modifiers.str;
}
function weaponProficient(item: EquipmentItem, derived: DerivedCharacter): boolean {
  return (
    derived.weaponProficiencies.includes(item.id) ||
    derived.weaponProficiencies.includes(item.proficiency ?? '')
  );
}
function selectedSpells(draft: CharacterDraft, catalog: CatalogData): Spell[] {
  const ancestry = catalog.ancestries.find((item) => item.id === draft.ancestryId);
  const feats = catalog.feats.filter((item) => draft.featIds.includes(item.id));
  const ids = new Set(draft.spellIds);
  for (const grant of [
    ...(ancestry?.spellGrants ?? []),
    ...feats.flatMap((feat) => feat.spellGrants ?? []),
  ])
    if (grant.minLevel <= draft.level) ids.add(grant.spellId);
  Object.values(draft.grantedSpellChoices ?? {})
    .flat()
    .forEach((id) => ids.add(id));
  for (const spell of catalog.spells)
    if (
      spell.subclassGrants?.some(
        (grant) =>
          grant.classId === draft.classId &&
          grant.subclassId === draft.subclassId &&
          grant.minLevel <= draft.level,
      )
    )
      ids.add(spell.id);
  return [
    ...catalog.spells
    .filter((spell) => ids.has(spell.id))
    ,
    ...(draft.homebrewSpells ?? []).map(asSpell),
  ].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'it'));
}
function selectedClassFeatures(draft: CharacterDraft, catalog: CatalogData): string[] {
  const klass = catalog.classes.find((item) => item.id === draft.classId);
  return (klass?.featureChoices ?? []).flatMap((choice) => {
    const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
    return choice.options
      .filter((option) => selected.has(option.id))
      .map((option) => `${choice.name}: ${option.name} - ${option.description}`);
  });
}
function inventoryLines(draft: CharacterDraft, catalog: CatalogData): string[] {
  return (draft.inventory ?? []).flatMap((entry) => {
    const item = catalog.equipment.find((candidate) => candidate.id === entry.equipmentId);
    return item ? [`${item.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ''}`] : [];
  });
}
function traitLines(
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): string[] {
  const ancestry = catalog.ancestries.find((item) => item.id === draft.ancestryId);
  return [
    ...(ancestry?.traitDetails ?? []).map((trait) => `${trait.name}: ${trait.effect}`),
    ...catalog.feats
      .filter((feat) => draft.featIds.includes(feat.id))
      .map((feat) => `${feat.name}: ${feat.description}`),
    ...selectedClassFeatures(draft, catalog),
    ...derived.classResources.map(
      (resource) =>
        `${resource.name}: ${resource.value}${resource.detail ? ` - ${resource.detail}` : ''}`,
    ),
    ...(draft.sanityEnabled
      ? [`Sanità mentale: ${derived.sanityScore} (${signed(derived.sanityModifier ?? 0)})`]
      : []),
  ];
}

function fillIdentity(
  form: PDFForm,
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): void {
  const ancestry = catalog.ancestries.find((item) => item.id === draft.ancestryId);
  const klass = catalog.classes.find((item) => item.id === draft.classId);
  const background = catalog.backgrounds.find((item) => item.id === draft.backgroundId);
  const classLabel = [klass?.name, draft.level, draft.subclassId ? `(${draft.subclassId})` : '']
    .filter(Boolean)
    .join(' ');
  setText(form, 'CharacterName', draft.name, { fontSize: 12 });
  setText(form, 'ClassLevel', classLabel, { fontSize: 7 });
  setText(form, 'Background', background?.name, { fontSize: 8 });
  setText(form, 'PlayerName', '', { fontSize: 8 });
  setText(form, 'Race ', ancestry?.name, { fontSize: 8 });
  setText(form, 'Alignment', ALIGNMENTS[draft.alignment ?? ''] ?? '', { fontSize: 8 });
  setText(form, 'XP', derived.experience, { fontSize: 8 });
}
function fillAbilities(form: PDFForm, draft: CharacterDraft, derived: DerivedCharacter): void {
  const score: Record<AbilityKey, string> = {
    str: 'STR',
    dex: 'DEX',
    con: 'CON',
    int: 'INT',
    wis: 'WIS',
    cha: 'CHA',
  };
  const mod: Record<AbilityKey, string> = {
    str: 'STRmod',
    dex: 'DEXmod',
    con: 'CONmod',
    int: 'INTmod',
    wis: 'WISmod',
    cha: 'CHAmod',
  };
  for (const ability of ABILITIES) {
    setText(form, score[ability], derived.finalAbilities[ability], { fontSize: 16 });
    setText(form, mod[ability], signed(derived.modifiers[ability]), { fontSize: 9 });
  }
  setText(form, 'ProfBonus', signed(derived.proficiency), { fontSize: 10 });
  INSPIRATION_FIELDS.forEach((field, index) =>
    setChecked(form, field, !!draft.inspiration && index === 0),
  );
  for (const save of derived.savingThrows) {
    const [valueField, proficiencyField] = SAVE_FIELDS[save.ability];
    setText(form, valueField, signed(save.value), { fontSize: 7 });
    setChecked(form, proficiencyField, save.proficient);
  }
  for (const skill of derived.skills) {
    const fields = SKILL_FIELDS[skill.id];
    if (!fields) continue;
    setText(form, fields[0], signed(skill.value), { fontSize: 7 });
    setChecked(form, fields[1], skill.proficient);
  }
  setText(form, 'Passive', derived.passivePerception, { fontSize: 10 });
}
function fillCombat(
  form: PDFForm,
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): void {
  setText(form, 'AC', derived.armorClass, { fontSize: 15 });
  setText(form, 'Initiative', signed(derived.initiative), { fontSize: 14 });
  setText(form, 'Speed', `${derived.speedMeters} m`, { fontSize: 12 });
  setText(form, 'HPMax', derived.maxHp, { fontSize: 8 });
  setText(form, 'HPCurrent', draft.currentHp ?? derived.maxHp, { fontSize: 16 });
  setText(form, 'HPTemp', draft.temporaryHp ?? 0, { fontSize: 14 });
  setText(form, 'HDTotal', `${draft.level}d${derived.hitDie}`, { fontSize: 8 });
  setText(form, 'HD', `${derived.hitDiceRemaining}d${derived.hitDie}`, { fontSize: 10 });
  DEATH_SUCCESSES.forEach((field, index) =>
    setChecked(form, field, index < (draft.deathSaveSuccesses ?? 0)),
  );
  DEATH_FAILURES.forEach((field, index) =>
    setChecked(form, field, index < (draft.deathSaveFailures ?? 0)),
  );
  const weapons = equippedWeaponItems(draft, catalog);
  const fields = [
    ['Wpn Name', 'Wpn1 AtkBonus', 'Wpn1 Damage'],
    ['Wpn Name 2', 'Wpn2 AtkBonus ', 'Wpn2 Damage '],
    ['Wpn Name 3', 'Wpn3 AtkBonus  ', 'Wpn3 Damage '],
    ['Wpn Name 4', 'Wpn4 AtkBonus', 'Wpn4 Damage'],
    ['Wpn Name 5', 'Wpn5 AtkBonus', 'Wpn5 Damage'],
  ];
  weapons.slice(0, fields.length).forEach(({ item: weapon, equipped }, index) => {
    const ability = index === 1 && !hasTwoWeaponFighting(draft) ? 0 : weaponModifier(weapon, derived);
    const attack = weaponModifier(weapon, derived) + (weaponProficient(weapon, derived) ? derived.proficiency : 0);
    setText(form, fields[index][0], `${weapon.name}${equipped.hands === 2 ? ' (2 mani)' : ''}`, { fontSize: 7 });
    setText(form, fields[index][1], signed(attack), { fontSize: 7 });
    setText(
      form,
      fields[index][2],
      `${damageForHands(weapon, equipped.hands)}${ability ? signed(ability) : ''} ${weapon.damageType ?? ''}`,
      { fontSize: 6.5 },
    );
  });
  setText(
    form,
    'AttacksSpellcasting',
    [
      derived.spellAttack === undefined
        ? ''
        : `Attacco incantesimi: ${signed(derived.spellAttack)}`,
      derived.spellDc === undefined ? '' : `CD incantesimi: ${derived.spellDc}`,
      ...weapons.slice(fields.length).map(({ item: weapon }) => weapon.name),
    ]
      .filter(Boolean)
      .join('\n'),
    { multiline: true, fontSize: 7 },
  );
}
function fillFirstPageDetails(
  form: PDFForm,
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): void {
  setText(form, 'PersonalityTraits ', draft.personalityTraits, { multiline: true, fontSize: 7 });
  setText(form, 'Ideals', draft.ideals, { multiline: true, fontSize: 7 });
  setText(form, 'Bonds', draft.bonds, { multiline: true, fontSize: 7 });
  setText(form, 'Flaws', draft.flaws, { multiline: true, fontSize: 7 });
  setText(
    form,
    'ProficienciesLang',
    [
      `Lingue: ${derived.languages.join(', ') || '-'}`,
      `Strumenti: ${derived.tools.join(', ') || '-'}`,
      `Armature: ${derived.armorProficiencies.join(', ') || '-'}`,
      `Armi: ${derived.weaponProficiencies.join(', ') || '-'}`,
    ].join('\n'),
    { multiline: true, fontSize: 6.5 },
  );
  setText(
    form,
    'Equipment',
    [
      ...inventoryLines(draft, catalog),
      `Peso: ${derived.inventoryWeightKg}/${derived.carryingCapacityKg} kg`,
    ].join('\n'),
    { multiline: true, fontSize: 6.5 },
  );
  const coins = draft.coins;
  setText(form, 'CP', coins?.cp ?? 0, { fontSize: 8 });
  setText(form, 'SP', coins?.sp ?? 0, { fontSize: 8 });
  setText(form, 'EP', coins?.ep ?? 0, { fontSize: 8 });
  setText(form, 'GP', coins?.gp ?? 0, { fontSize: 8 });
  setText(form, 'PP', coins?.pp ?? 0, { fontSize: 8 });
  setText(
    form,
    'Features and Traits',
    traitLines(draft, derived, catalog)
      .map((line) => line.split(':')[0])
      .join('\n'),
    { multiline: true, fontSize: 6.5 },
  );
}
function fillSecondPage(
  form: PDFForm,
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): void {
  setText(form, 'Age', draft.age, { fontSize: 8 });
  setText(form, 'Height', draft.heightCm ? `${draft.heightCm} cm` : '', { fontSize: 8 });
  setText(form, 'Weight', draft.weightKg ? `${draft.weightKg} kg` : '', { fontSize: 8 });
  setText(form, 'Text1', draft.appearance ? `Aspetto: ${draft.appearance}` : '', {
    multiline: true,
    fontSize: 6.5,
  });
  setText(form, 'Backstory', draft.notes, { multiline: true, fontSize: 7 });
  setText(form, 'Feats+Traits', traitLines(draft, derived, catalog).join('\n\n'), {
    multiline: true,
    fontSize: 6.5,
  });
  const coins = draft.coins;
  setText(
    form,
    'Treasure',
    [
      ...inventoryLines(draft, catalog),
      coins
        ? `Rame ${coins.cp}, argento ${coins.sp}, electrum ${coins.ep}, oro ${coins.gp}, platino ${coins.pp}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    { multiline: true, fontSize: 7 },
  );
}
function castingAbility(classId: string): AbilityKey | undefined {
  if (['bard', 'paladin', 'sorcerer', 'warlock'].includes(classId)) return 'cha';
  if (['cleric', 'druid', 'ranger'].includes(classId)) return 'wis';
  if (['wizard', 'artificer'].includes(classId)) return 'int';
  return undefined;
}
function fillSpellPage(
  form: PDFForm,
  draft: CharacterDraft,
  derived: DerivedCharacter,
  catalog: CatalogData,
): void {
  const klass = catalog.classes.find((item) => item.id === draft.classId);
  const ability = castingAbility(draft.classId);
  const labels: Record<AbilityKey, string> = {
    str: 'FOR',
    dex: 'DES',
    con: 'COS',
    int: 'INT',
    wis: 'SAG',
    cha: 'CAR',
  };
  setText(form, 'Spellcasting Class 2', klass?.name, { fontSize: 11 });
  setText(form, 'SpellcastingAbility 2', ability ? labels[ability] : '', { fontSize: 13 });
  setText(form, 'SpellSaveDC  2', derived.spellDc ?? '', { fontSize: 13 });
  setText(
    form,
    'SpellAtkBonus 2',
    derived.spellAttack === undefined ? '' : signed(derived.spellAttack),
    { fontSize: 13 },
  );
  const slots = spellSlots(draft.classId, draft.level);
  for (let level = 1; level <= 9; level += 1) {
    const slot = slots.find((entry) => entry.level === level);
    setText(form, SLOT_FIELDS[level][0], slot?.slots ?? '', { fontSize: 10 });
    setText(form, SLOT_FIELDS[level][1], slot?.slots ?? '', { fontSize: 10 });
  }
  const spells = selectedSpells(draft, catalog);
  for (let level = 0; level <= 9; level += 1) {
    const atLevel = spells.filter((spell) => spell.level === level);
    SPELL_FIELDS[level].forEach((field, index) =>
      setText(form, field, atLevel[index]?.name ?? '', { fontSize: 7 }),
    );
    (SPELL_CHECKBOXES[level] ?? []).forEach((field, index) =>
      setChecked(form, field, index < atLevel.length),
    );
  }
}

export async function buildCharacterSheetPdf(
  template: ArrayBuffer | Uint8Array,
  draft: CharacterDraft,
  catalog: CatalogData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(template);
  if (pdf.getPageCount() !== 3)
    throw new Error('Il modello della scheda deve contenere esattamente 3 pagine.');
  const form = pdf.getForm();
  if (!getTextField(form, 'CharacterName') || !getTextField(form, 'ClassLevel'))
    throw new Error('Il modello PDF non è la scheda compilabile attesa.');
  const font: PDFFont = await pdf.embedFont(StandardFonts.Helvetica);
  const derived = derive(draft, catalog);
  fillIdentity(form, draft, derived, catalog);
  fillAbilities(form, draft, derived);
  fillCombat(form, draft, derived, catalog);
  fillFirstPageDetails(form, draft, derived, catalog);
  fillSecondPage(form, draft, derived, catalog);
  fillSpellPage(form, draft, derived, catalog);
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) field.updateAppearances(font);
    if (field instanceof PDFCheckBox)
      for (const widget of field.acroField.getWidgets()) widget.getBorderStyle()?.setWidth(0);
  }
  pdf.setTitle(`${draft.name || 'Personaggio'} - Forgia dell'avventuriero`);
  pdf.setCreator("Forgia dell'avventuriero");
  pdf.setProducer("Forgia dell'avventuriero");
  return pdf.save();
}
