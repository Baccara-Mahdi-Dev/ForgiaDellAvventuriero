import { readFile } from 'node:fs/promises';

const version = process.argv[2] ?? 'v1';
if (!/^v\d+$/.test(version)) throw new Error(`Versione catalogo non valida: ${version}`);
const root = new URL(`${version}/`, new URL('../public/data/', import.meta.url));
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
if (manifest.additionalEquipment) {
  const records = await readJson(manifest.additionalEquipment.file);
  if (!Array.isArray(records) || records.length !== manifest.additionalEquipment.count)
    throw new Error('Conteggio degli oggetti magici non valido');
  const existingIds = new Set(catalogs.equipment.map((item) => item.id));
  for (const item of records) {
    if (!item.id || !item.name || !item.description || item.source !== 'SRD')
      throw new Error(`Oggetto magico non valido: ${item.id ?? 'senza ID'}`);
    if (existingIds.has(item.id)) throw new Error(`ID equipaggiamento duplicato: ${item.id}`);
    existingIds.add(item.id);
  }
  catalogs.equipment.push(...records);
}
if (manifest.additionalCatalogs?.subclasses) {
  const definition = manifest.additionalCatalogs.subclasses;
  const records = await readJson(definition.file);
  if (!Array.isArray(records) || records.length !== definition.count)
    throw new Error(
      `Sottoclassi: dichiarate ${definition.count}, trovate ${Array.isArray(records) ? records.length : 0}`,
    );
  const ids = records.map((record) => record.id);
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length)
    throw new Error('Sottoclassi: ID mancanti o duplicati');
  for (const record of records) {
    if (!record.name || !record.description || !record.classId || !record.source)
      throw new Error(`Sottoclasse non valida: ${record.id ?? 'senza ID'}`);
    if (!manifest.sources.includes(record.source))
      throw new Error(`subclasses/${record.id}: fonte ${record.source} non dichiarata`);
  }
  catalogs.subclasses = records;
}

const classIds = new Set(catalogs.classes.map((item) => item.id));
const spellIds = new Set(catalogs.spells.map((spell) => spell.id));
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
  const validActivations = new Set(['action', 'bonus-action', 'reaction', 'passive', 'special']);
  const choiceIds = new Set();
  const choiceOptionIds = new Map();
  const validateChoice = (choice, owner) => {
    if (
      !choice.id ||
      choiceIds.has(choice.id) ||
      !choice.name ||
      !Number.isInteger(choice.minLevel) ||
      choice.minLevel < 1 ||
      choice.minLevel > 20 ||
      !Array.isArray(choice.options) ||
      !choice.options.length ||
      (choice.repeatable !== undefined && typeof choice.repeatable !== 'boolean') ||
      (choice.requiresKnownSpell !== undefined && typeof choice.requiresKnownSpell !== 'boolean') ||
      (choice.exclusiveWithChoices !== undefined &&
        (!Array.isArray(choice.exclusiveWithChoices) ||
          new Set(choice.exclusiveWithChoices).size !== choice.exclusiveWithChoices.length)) ||
      (choice.requiresSelection !== undefined &&
        (!choiceIds.has(choice.requiresSelection.choiceId) ||
          !choiceOptionIds
            .get(choice.requiresSelection.choiceId)
            ?.has(choice.requiresSelection.optionId)))
    )
      throw new Error(`classes/${klass.id}/${owner}: scelta non valida`);
    choiceIds.add(choice.id);
    const optionIds = choice.options.map((option) => option.id);
    if (
      optionIds.some((id) => typeof id !== 'string' || !id) ||
      new Set(optionIds).size !== optionIds.length ||
      choice.options.some(
        (option) =>
          !option.name ||
          !option.description ||
          (option.activations !== undefined &&
            (!Array.isArray(option.activations) ||
              !option.activations.length ||
              option.activations.some((activation) => !validActivations.has(activation)))) ||
          (option.resource !== undefined && typeof option.resource !== 'string') ||
          (option.resourceCost !== undefined && typeof option.resourceCost !== 'string') ||
          (option.minLevel !== undefined &&
            (!Number.isInteger(option.minLevel) ||
              option.minLevel < choice.minLevel ||
              option.minLevel > 20)) ||
          (option.requiresSelection !== undefined &&
            (!choiceIds.has(option.requiresSelection.choiceId) ||
              !choiceOptionIds
                .get(option.requiresSelection.choiceId)
                ?.has(option.requiresSelection.optionId))),
      )
    )
      throw new Error(`classes/${klass.id}/${owner}/${choice.id}: opzioni non valide`);
    choiceOptionIds.set(choice.id, new Set(optionIds));
    let previousLevel = 0;
    let previousCount = 0;
    for (const threshold of choice.countByLevel ?? []) {
      if (
        !Number.isInteger(threshold.level) ||
        threshold.level < choice.minLevel ||
        threshold.level <= previousLevel ||
        !Number.isInteger(threshold.count) ||
        threshold.count <= previousCount ||
        (!choice.repeatable && threshold.count > choice.options.length)
      )
        throw new Error(`classes/${klass.id}/${owner}/${choice.id}: progressione non valida`);
      previousLevel = threshold.level;
      previousCount = threshold.count;
    }

    if (!previousCount)
      throw new Error(`classes/${klass.id}/${owner}/${choice.id}: progressione mancante`);
  };
  for (const choice of klass.featureChoices ?? []) validateChoice(choice, 'classe');
  const validateFeature = (feature, owner) => {
    if (
      !Number.isInteger(feature.level) ||
      feature.level < 1 ||
      feature.level > 20 ||
      !feature.name ||
      !feature.description ||
      (feature.activations !== undefined &&
        (!Array.isArray(feature.activations) ||
          !feature.activations.length ||
          feature.activations.some((activation) => !validActivations.has(activation)))) ||
      (feature.resource !== undefined && typeof feature.resource !== 'string') ||
      (feature.resourceCost !== undefined && typeof feature.resourceCost !== 'string')
    )
      throw new Error(`classes/${klass.id}/${owner}: privilegio non valido`);
  };
  if (!Array.isArray(klass.classProgression) || !klass.classProgression.length)
    throw new Error(`classes/${klass.id}: progressione di classe mancante`);
  for (const feature of klass.classProgression) validateFeature(feature, 'classe');
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
  for (const choice of [
    ...(klass.featureChoices ?? []),
    ...(klass.subclassFeatures ?? []).flatMap((featureSet) => featureSet.choices),
  ])
    if ((choice.exclusiveWithChoices ?? []).some((choiceId) => !choiceIds.has(choiceId)))
      throw new Error(`classes/${klass.id}/${choice.id}: gruppo esclusivo sconosciuto`);
  const progressionIds = new Set();
  for (const progression of klass.subclassProgressions ?? []) {
    if (
      !klass.subclasses.includes(progression.subclassId) ||
      progressionIds.has(progression.subclassId) ||
      !['PHB', 'XGE', 'TCE', 'PSA', 'SCAG', 'EGW'].includes(progression.sourceBook) ||
      !Number.isInteger(progression.sourcePages?.from) ||
      !Number.isInteger(progression.sourcePages?.to) ||
      progression.sourcePages.from < 1 ||
      progression.sourcePages.to < progression.sourcePages.from ||
      !Array.isArray(progression.features) ||
      !progression.features.length ||
      progression.features.some((feature) => {
        try {
          validateFeature(feature, progression.subclassId);
          return false;
        } catch {
          return true;
        }
      })
    )
      throw new Error(`classes/${klass.id}/${progression.subclassId}: progressione non valida`);
    progressionIds.add(progression.subclassId);
  }
  const missingProgressions = klass.subclasses.filter((subclass) => !progressionIds.has(subclass));
  if (missingProgressions.length)
    throw new Error(
      `classes/${klass.id}: progressioni mancanti: ${missingProgressions.join(', ')}`,
    );
  for (const list of klass.subclassSpellLists ?? []) {
    if (
      !klass.subclasses.includes(list.subclassId) ||
      !Array.isArray(list.spellIds) ||
      !list.spellIds.length ||
      list.spellIds.some((id) => !spellIds.has(id)) ||
      new Set(list.spellIds).size !== list.spellIds.length ||
      (list.requiresSelection !== undefined &&
        (!choiceIds.has(list.requiresSelection.choiceId) ||
          !choiceOptionIds
            .get(list.requiresSelection.choiceId)
            ?.has(list.requiresSelection.optionId)))
    )
      throw new Error(`classes/${klass.id}/${list.subclassId}: lista incantesimi non valida`);
  }
}

const toolChoiceCategories = new Set(['artisan-tool', 'gaming-set', 'musical-instrument']);
for (const background of catalogs.backgrounds) {
  const choices = background.toolChoices ?? 0;
  if (!Number.isInteger(choices) || choices < 0)
    throw new Error(`backgrounds/${background.id}: toolChoices non valido`);
  if (choices && !toolChoiceCategories.has(background.toolChoiceCategory))
    throw new Error(`backgrounds/${background.id}: categoria strumenti mancante o non valida`);
}

const expectedSrdSubclasses = {
  barbarian: ['Berserker'],
  bard: ['Collegio della Sapienza'],
  cleric: ['Dominio della Vita'],
  druid: ['Circolo della Terra'],
  fighter: ['Campione'],
  monk: ['Via della Mano Aperta'],
  paladin: ['Giuramento di Devozione'],
  ranger: ['Cacciatore'],
  rogue: ['Furfante'],
  sorcerer: ['Discendenza Draconica'],
  warlock: ["L'Immondo"],
  wizard: ['Scuola di Invocazione'],
};
for (const [classId, expected] of Object.entries(expectedSrdSubclasses)) {
  const klass = catalogs.classes.find((candidate) => candidate.id === classId);
  const missing = expected.filter((subclass) => !klass?.subclasses.includes(subclass));
  if (missing.length)
    throw new Error(`classes/${classId}: sottoclassi SRD mancanti: ${missing.join(', ')}`);
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
  const grantKeys = new Set();
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
    const grantKey = `${grant.classId}|${grant.subclassId}`;
    if (grantKeys.has(grantKey))
      throw new Error(`spells/${spell.id}: concessione di sottoclasse duplicata`);
    grantKeys.add(grantKey);
  }
}
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
  const choiceIds = new Set();
  for (const choice of feat.proficiencyChoices ?? []) {
    if (
      !choice.id ||
      choiceIds.has(choice.id) ||
      !choice.label ||
      !Number.isInteger(choice.count) ||
      choice.count < 1 ||
      !['skill', 'tool', 'skill-or-tool', 'weapon', 'expertise', 'language'].includes(choice.kind)
    )
      throw new Error(`feats/${feat.id}: scelta di competenza non valida`);
    choiceIds.add(choice.id);
  }
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
  if (
    effects.savingThrowProficiencyFromAbility !== undefined &&
    typeof effects.savingThrowProficiencyFromAbility !== 'boolean'
  )
    throw new Error(`feats/${feat.id}: competenza nei tiri salvezza non valida`);
  for (const armor of effects.armorProficiencies ?? [])
    if (!['clothing', 'light', 'medium', 'heavy', 'shield'].includes(armor))
      throw new Error(`feats/${feat.id}: competenza armatura sconosciuta ${armor}`);
  for (const tool of effects.toolProficiencies ?? [])
    if (typeof tool !== 'string' || !tool)
      throw new Error(`feats/${feat.id}: competenza strumento non valida`);
  for (const weapon of effects.weaponProficiencies ?? [])
    if (typeof weapon !== 'string' || !weapon)
      throw new Error(`feats/${feat.id}: competenza arma non valida`);
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

const validatedCatalogNames = [...names, ...(catalogs.subclasses ? ['subclasses'] : [])];
const total = validatedCatalogNames.reduce((sum, name) => sum + catalogs[name].length, 0);
console.log(
  `Dataset ${manifest.dataVersion}: ${total} record verificati in ${validatedCatalogNames.length} cataloghi.`,
);
