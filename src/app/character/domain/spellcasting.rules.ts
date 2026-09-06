import { CatalogData } from '../../domain/catalog';
import { CharacterDraft, Spell } from '../../domain/models';
import { activeClassFeatureChoices } from '../../domain/class-progression';
import { maximumSpellLevel, subclassSpellcastingProfile } from '../../domain/rules';
import { equippedEquipmentIds } from '../../domain/equipment-effects';
import { asSpell } from '../../domain/homebrew-spell';

export function selectActiveGrantedSpellChoiceIds(
  draft: CharacterDraft,
  catalog: Pick<CatalogData, 'ancestries' | 'feats'>,
  respectMinimumLevel = false,
): string[] {
  const ancestry = catalog.ancestries.find((item) => item.id === draft.ancestryId);
  const feats = catalog.feats.filter((item) => draft.featIds.includes(item.id));
  const activeChoices = new Set([
    ...(ancestry?.spellChoices ?? [])
      .filter((choice) => !respectMinimumLevel || (choice.minLevel ?? 1) <= draft.level)
      .map((choice) => choice.id),
    ...feats.flatMap((feat) =>
      (feat.spellChoices ?? [])
        .filter((choice) => !respectMinimumLevel || (choice.minLevel ?? 1) <= draft.level)
        .map((choice) => choice.id),
    ),
  ]);
  return Object.entries(draft.grantedSpellChoices ?? {})
    .filter(([choiceId]) => activeChoices.has(choiceId))
    .flatMap(([, spellIds]) => spellIds);
}

export function selectFixedGrantedSpellIds(
  draft: CharacterDraft,
  catalog: Pick<CatalogData, 'ancestries' | 'feats' | 'classes' | 'spells'>,
): string[] {
  const ancestry = catalog.ancestries.find((item) => item.id === draft.ancestryId);
  const feats = catalog.feats.filter((item) => draft.featIds.includes(item.id));
  const klass = catalog.classes.find((item) => item.id === draft.classId);
  const ids = [...(ancestry?.spellGrants ?? []), ...feats.flatMap((feat) => feat.spellGrants ?? [])]
    .filter((grant) => grant.minLevel <= draft.level)
    .map((grant) => grant.spellId);
  ids.push(
    ...activeClassFeatureChoices(
      klass,
      draft.level,
      draft.subclassId,
      draft.classFeatureChoices,
    ).flatMap((choice) =>
      choice.effect === 'spell-grant' ? (draft.classFeatureChoices?.[choice.id] ?? []) : [],
    ),
    ...catalog.spells
      .filter((spell) =>
        spell.subclassGrants?.some(
          (grant) =>
            grant.classId === draft.classId &&
            grant.subclassId === draft.subclassId &&
            grant.minLevel <= draft.level,
        ),
      )
      .map((spell) => spell.id),
  );
  return [...new Set(ids)];
}

export function selectAvailableSpells(draft: CharacterDraft, catalog: CatalogData): Spell[] {
  const maxLevel = maximumSpellLevel(draft.classId, draft.level, draft.subclassId);
  const subclassCaster = subclassSpellcastingProfile(draft.classId, draft.subclassId, draft.level);
  const spellClassId = subclassCaster?.spellClassId ?? draft.classId;
  const divineSoul = draft.classId === 'sorcerer' && draft.subclassId === 'Anima Divina';
  const klass = catalog.classes.find((item) => item.id === draft.classId);
  const expandedSpellIds = new Set(
    (klass?.subclassSpellLists ?? [])
      .filter(
        (list) =>
          list.subclassId === draft.subclassId &&
          (!list.requiresSelection ||
            (draft.classFeatureChoices?.[list.requiresSelection.choiceId] ?? []).includes(
              list.requiresSelection.optionId,
            )),
      )
      .flatMap((list) => list.spellIds),
  );
  const granted = new Set([
    ...selectFixedGrantedSpellIds(draft, catalog),
    ...selectActiveGrantedSpellChoiceIds(draft, catalog),
  ]);
  return catalog.spells.filter(
    (spell) =>
      (spell.classes.includes(spellClassId) ||
        expandedSpellIds.has(spell.id) ||
        (divineSoul && spell.classes.includes('cleric'))) &&
      spell.level <= maxLevel &&
      !granted.has(spell.id),
  );
}

export function selectCharacterSpells(draft: CharacterDraft, catalog: CatalogData): Spell[] {
  const ids = new Set([
    ...draft.spellIds,
    ...selectFixedGrantedSpellIds(draft, catalog),
    ...selectActiveGrantedSpellChoiceIds(draft, catalog, true),
  ]);
  const equipped = equippedEquipmentIds(draft);
  const attuned = new Set(draft.attunedEquipmentIds ?? []);
  for (const item of [...catalog.equipment, ...(draft.homebrewEquipment ?? [])])
    if (equipped.has(item.id) && (!item.requiresAttunement || attuned.has(item.id)))
      for (const grant of item.spellGrants ?? []) ids.add(grant.spellId);
  return [
    ...catalog.spells.filter((spell) => ids.has(spell.id)),
    ...(draft.homebrewSpells ?? []).map(asSpell),
  ].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'it'));
}
