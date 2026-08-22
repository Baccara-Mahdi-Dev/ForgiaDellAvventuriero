import { readFile } from 'node:fs/promises';

const root = new URL('../public/data/v1/', import.meta.url);
const readJson = async (file) => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const manifest = await readJson('manifest.json');
const names = ['ancestries', 'classes', 'backgrounds', 'feats', 'spells', 'equipment'];

for (const field of [
  'schemaVersion',
  'dataVersion',
  'locale',
  'ruleset',
  'catalog',
  'files',
  'sources',
]) {
  if (manifest[field] === undefined) throw new Error(`Campo manifest mancante: ${field}`);
}
if (manifest.schemaVersion !== 1)
  throw new Error(`Schema non supportato: ${manifest.schemaVersion}`);

const catalogs = {};
for (const name of names) {
  const file = manifest.files[name];
  if (typeof file !== 'string' || !file.endsWith('.json'))
    throw new Error(`File non valido per ${name}`);
  const records = await readJson(file);
  if (!Array.isArray(records)) throw new Error(`${file} deve contenere un array`);
  if (records.length !== manifest.catalog[name])
    throw new Error(`${name}: dichiarati ${manifest.catalog[name]}, trovati ${records.length}`);
  const ids = records.map((record) => record.id);
  if (ids.some((id) => typeof id !== 'string' || !id))
    throw new Error(`${name}: ogni record deve avere un ID`);
  if (new Set(ids).size !== ids.length) throw new Error(`${name}: ID duplicati`);
  for (const record of records) {
    const requiredFields =
      name === 'equipment' ? ['name', 'source'] : ['name', 'description', 'source'];
    for (const field of requiredFields)
      if (typeof record[field] !== 'string' || !record[field])
        throw new Error(`${name}/${record.id}: campo ${field} mancante`);
    if (!manifest.sources.includes(record.source))
      throw new Error(`${name}/${record.id}: fonte ${record.source} non dichiarata`);
  }
  catalogs[name] = records;
}

const classIds = new Set(catalogs.classes.map((item) => item.id));
const abilityIds = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha']);
const skillIds = new Set([
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
]);
for (const ancestry of catalogs.ancestries) {
  if (!Array.isArray(ancestry.languages))
    throw new Error(`ancestries/${ancestry.id}: lingue mancanti`);
  if (ancestry.traitDetails && ancestry.traitDetails.some((trait) => !trait.name || !trait.effect))
    throw new Error(`ancestries/${ancestry.id}: dettaglio tratto incompleto`);
  for (const ability of ancestry.flexibleBonusOptions ?? [])
    if (!abilityIds.has(ability))
      throw new Error(
        `ancestries/${ancestry.id}: caratteristica flessibile sconosciuta ${ability}`,
      );
  for (const skill of [
    ...(ancestry.skillProficiencies ?? []),
    ...(ancestry.skillChoiceOptions ?? []),
  ])
    if (!skillIds.has(skill))
      throw new Error(`ancestries/${ancestry.id}: abilità sconosciuta ${skill}`);
  for (const [countField, optionsField] of [
    ['skillChoices', 'skillChoiceOptions'],
    ['toolChoices', 'toolOptions'],
  ]) {
    const count = ancestry[countField] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > (ancestry[optionsField]?.length ?? 0))
      throw new Error(`ancestries/${ancestry.id}: ${countField} non valido`);
  }
}
for (const klass of catalogs.classes) {
  if (
    !Number.isInteger(klass.subclassLevel) ||
    klass.subclassLevel < 1 ||
    klass.subclassLevel > 20 ||
    !Array.isArray(klass.subclasses) ||
    !klass.subclasses.length ||
    klass.subclasses.some((subclass) => typeof subclass !== 'string' || !subclass.trim()) ||
    new Set(klass.subclasses).size !== klass.subclasses.length ||
    !Number.isInteger(klass.skillChoices) ||
    klass.skillChoices < 0 ||
    !Array.isArray(klass.skillOptions)
  )
    throw new Error(`classes/${klass.id}: scelta competenze non valida`);
  for (const skill of klass.skillOptions)
    if (!skillIds.has(skill)) throw new Error(`classes/${klass.id}: abilità sconosciuta ${skill}`);
  const choiceIds = new Set();
  const validateChoice = (choice, owner) => {
    if (
      !choice.id ||
      choiceIds.has(choice.id) ||
      !choice.name ||
      !Number.isInteger(choice.minLevel) ||
      choice.minLevel < 1 ||
      choice.minLevel > 20 ||
      !Array.isArray(choice.options) ||
      !choice.options.length
    )
      throw new Error(`classes/${klass.id}/${owner}: scelta non valida`);
    choiceIds.add(choice.id);
    const optionIds = choice.options.map((option) => option.id);
    if (
      optionIds.some((id) => typeof id !== 'string' || !id) ||
      new Set(optionIds).size !== optionIds.length ||
      choice.options.some((option) => !option.name || !option.description)
    )
      throw new Error(`classes/${klass.id}/${owner}/${choice.id}: opzioni non valide`);
    let previousLevel = 0;
    let previousCount = 0;
    for (const threshold of choice.countByLevel ?? []) {
      if (
        !Number.isInteger(threshold.level) ||
        threshold.level < choice.minLevel ||
        threshold.level <= previousLevel ||
        !Number.isInteger(threshold.count) ||
        threshold.count <= previousCount ||
        threshold.count > choice.options.length
      )
        throw new Error(`classes/${klass.id}/${owner}/${choice.id}: progressione non valida`);
      previousLevel = threshold.level;
      previousCount = threshold.count;
    }

    if (!previousCount)
      throw new Error(`classes/${klass.id}/${owner}/${choice.id}: progressione mancante`);
  };
  for (const choice of klass.featureChoices ?? []) validateChoice(choice, 'classe');
  const subclassFeatureIds = new Set();
  for (const featureSet of klass.subclassFeatures ?? []) {
    if (
      !klass.subclasses.includes(featureSet.subclassId) ||
      subclassFeatureIds.has(featureSet.subclassId) ||
      !Array.isArray(featureSet.choices) ||
      !featureSet.choices.length
    )
      throw new Error(`classes/${klass.id}: feature di sottoclasse non valide`);
    subclassFeatureIds.add(featureSet.subclassId);
    for (const choice of featureSet.choices) {
      if (choice.minLevel < klass.subclassLevel)
        throw new Error(
          `classes/${klass.id}/${featureSet.subclassId}/${choice.id}: feature precedente alla sottoclasse`,
        );
      validateChoice(choice, featureSet.subclassId);
    }
  }
}
const castingUnits = new Set(['action', 'bonus-action', 'reaction', 'minute', 'hour', 'special']);
const durationUnits = new Set([
  'instantaneous',
  'round',
  'minute',
  'hour',
  'day',
  'until-dispelled',
  'special',
]);
for (const spell of catalogs.spells) {
  for (const classId of spell.classes ?? [])
    if (!classIds.has(classId))
      throw new Error(`spells/${spell.id}: classe sconosciuta ${classId}`);
  if (
    !Number.isInteger(spell.castingTime?.amount) ||
    spell.castingTime.amount < 1 ||
    !castingUnits.has(spell.castingTime.unit)
  )
    throw new Error(`spells/${spell.id}: tempo di lancio non valido`);
  if (!durationUnits.has(spell.duration?.unit) || typeof spell.duration.concentration !== 'boolean')
    throw new Error(`spells/${spell.id}: durata non valida`);
  if (
    !['instantaneous', 'until-dispelled', 'special'].includes(spell.duration.unit) &&
    (!Number.isInteger(spell.duration.amount) || spell.duration.amount < 1)
  )
    throw new Error(`spells/${spell.id}: quantità della durata non valida`);
  if (spell.attackRoll && !['melee', 'ranged'].includes(spell.attackRoll))
    throw new Error(`spells/${spell.id}: tiro per colpire non valido`);
  if (spell.savingThrow && !abilityIds.has(spell.savingThrow))
    throw new Error(`spells/${spell.id}: tiro salvezza non valido`);
  for (const savingThrow of spell.savingThrows ?? [])
    if (!abilityIds.has(savingThrow))
      throw new Error(`spells/${spell.id}: tiro salvezza multiplo non valido`);
  if (spell.damage && (!spell.damage.formula || !spell.damage.type))
    throw new Error(`spells/${spell.id}: danni incompleti`);
  for (const grant of spell.subclassGrants ?? []) {
    const klass = catalogs.classes.find((item) => item.id === grant.classId);
    if (
      !klass ||
      !klass.subclasses.includes(grant.subclassId) ||
      !Number.isInteger(grant.minLevel) ||
      grant.minLevel < 1 ||
      grant.minLevel > 20
    )
      throw new Error(`spells/${spell.id}: concessione di sottoclasse non valida`);
  }
}
const spellIds = new Set(catalogs.spells.map((spell) => spell.id));
for (const owner of [...catalogs.ancestries, ...catalogs.feats]) {
  for (const grant of owner.spellGrants ?? []) {
    if (!spellIds.has(grant.spellId) || !Number.isInteger(grant.minLevel) || grant.minLevel < 1)
      throw new Error(`${owner.id}: concessione incantesimo non valida`);
  }
  for (const choice of owner.spellChoices ?? []) {
    if (!choice.id || !choice.label || !Number.isInteger(choice.count) || choice.count < 1)
      throw new Error(`${owner.id}: scelta incantesimo non valida`);
    if (!Number.isInteger(choice.level) || choice.level < 0 || choice.level > 9)
      throw new Error(`${owner.id}/${choice.id}: livello scelta non valido`);
    for (const classId of [...(choice.classes ?? []), ...(choice.traditionOptions ?? [])])
      if (!classIds.has(classId))
        throw new Error(`${owner.id}/${choice.id}: tradizione sconosciuta ${classId}`);
  }
}
for (const feat of catalogs.feats) {
  const effects = feat.effects;
  if (!effects) continue;
  if (effects.abilityIncrease) {
    if (
      !Number.isInteger(effects.abilityIncrease.amount) ||
      effects.abilityIncrease.amount < 1 ||
      !effects.abilityIncrease.options?.length
    )
      throw new Error(`feats/${feat.id}: aumento caratteristica non valido`);
    for (const ability of effects.abilityIncrease.options)
      if (!abilityIds.has(ability))
        throw new Error(`feats/${feat.id}: caratteristica sconosciuta ${ability}`);
  }
  for (const field of [
    'hitPointsPerLevel',
    'initiativeBonus',
    'passivePerceptionBonus',
    'passiveInvestigationBonus',
  ])
    if (effects[field] !== undefined && typeof effects[field] !== 'number')
      throw new Error(`feats/${feat.id}: effetto ${field} non valido`);
}
const equipmentCategories = new Set(['armor', 'weapon', 'adventuring-gear', 'artisan-tool']);
for (const item of catalogs.equipment) {
  if (!equipmentCategories.has(item.category))
    throw new Error(`equipment/${item.id}: categoria non valida`);
  if (typeof item.group !== 'string' || !item.group)
    throw new Error(`equipment/${item.id}: gruppo mancante`);
  if (typeof item.cost !== 'string' || typeof item.weightKg !== 'number' || item.weightKg < 0)
    throw new Error(`equipment/${item.id}: costo o peso non valido`);
  if (item.source !== 'SRD') throw new Error(`equipment/${item.id}: fonte non SRD`);
}

const total = names.reduce((sum, name) => sum + catalogs[name].length, 0);
console.log(
  `Dataset ${manifest.dataVersion}: ${total} record verificati in ${names.length} cataloghi.`,
);
