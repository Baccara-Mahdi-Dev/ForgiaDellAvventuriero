import {
  Ancestry,
  CharacterClass,
  CharacterDraft,
  CharacterFeature,
  ClassFeatureChoice,
  FeatureActivation,
  SKILLS,
} from './models';

const skillOptions = SKILLS.map((skill) => ({
  id: skill.id,
  name: skill.name,
  description: 'Abilità',
  kind: 'skill' as const,
}));

const musicalInstruments = [
  'Cornamusa',
  'Flauto',
  'Flauto di Pan',
  'Liuto',
  'Lira',
  'Tamburo',
  'Dulcimer',
  'Corno',
  'Ciaramella',
  'Viola',
].map((name) => ({
  id: `instrument-${name.toLowerCase().replaceAll(' ', '-')}`,
  name,
  description: 'Strumento musicale',
  kind: 'tool' as const,
}));

const artisanTools = [
  'Scorte da alchimista',
  'Scorte da birraio',
  'Scorte da calligrafo',
  'Strumenti da carpentiere',
  'Strumenti da cartografo',
  'Strumenti da ciabattino',
  'Utensili da cuoco',
  'Strumenti da soffiatore di vetro',
  'Strumenti da gioielliere',
  'Strumenti da conciatore',
  'Strumenti da muratore',
  'Scorte da pittore',
  'Strumenti da vasaio',
  'Strumenti da fabbro',
  'Strumenti da stagnino',
  'Strumenti da tessitore',
  'Strumenti da intagliatore del legno',
].map((name) => ({
  id: `artisan-${name.toLowerCase().replaceAll(' ', '-')}`,
  name,
  description: 'Strumento da artigiano',
  kind: 'tool' as const,
}));

const gamingSets = [
  'Set di dadi',
  'Mazzo di carte',
  'Scacchi dei Draghi',
  'Tre Draghi al Buio',
].map((name) => ({
  id: `gaming-${name.toLowerCase().replaceAll(' ', '-')}`,
  name,
  description: 'Strumento da gioco',
  kind: 'tool' as const,
}));

function rulesChoices(klass: CharacterClass, subclassId: string): ClassFeatureChoice[] {
  const choices: ClassFeatureChoice[] = [];
  if (klass.id === 'bard') {
    choices.push(
      {
        id: 'bard-musical-instruments',
        name: 'Strumenti musicali',
        description: 'Scegli tre strumenti musicali nei quali ottieni competenza.',
        minLevel: 1,
        countByLevel: [{ level: 1, count: 3 }],
        options: musicalInstruments,
        effect: 'tool-proficiency',
      },
      {
        id: 'bard-expertise',
        name: 'Maestria',
        description:
          'Scegli abilità nelle quali sei già competente: il bonus di competenza viene raddoppiato.',
        minLevel: 3,
        countByLevel: [
          { level: 3, count: 2 },
          { level: 10, count: 4 },
        ],
        options: skillOptions,
        effect: 'skill-expertise',
        requiresProficiency: true,
      },
    );
    if (subclassId === 'Collegio della Sapienza')
      choices.push({
        id: 'bard-lore-bonus-skills',
        name: 'Competenze bonus',
        description: 'Scegli tre abilità aggiuntive nelle quali ottieni competenza.',
        minLevel: 3,
        countByLevel: [{ level: 3, count: 3 }],
        options: skillOptions,
        effect: 'skill-proficiency',
      });
  }
  if (klass.id === 'rogue') {
    choices.push({
      id: 'rogue-expertise',
      name: 'Maestria',
      description:
        'Scegli abilità competenti o gli arnesi da scasso: il bonus di competenza viene raddoppiato.',
      minLevel: 1,
      countByLevel: [
        { level: 1, count: 2 },
        { level: 6, count: 4 },
      ],
      options: [
        ...skillOptions,
        {
          id: 'thieves-tools',
          name: 'Arnesi da scasso',
          description: 'Strumento',
          kind: 'tool' as const,
        },
      ],
      effect: 'skill-expertise',
      requiresProficiency: true,
    });
    if (subclassId === 'Pianificatore')
      choices.push({
        id: 'rogue-mastermind-gaming-set',
        name: 'Strumento da gioco',
        description: 'Scegli uno strumento da gioco nel quale ottieni competenza.',
        minLevel: 3,
        countByLevel: [{ level: 3, count: 1 }],
        options: gamingSets,
        effect: 'tool-proficiency',
      });
  }
  if (klass.id === 'monk')
    choices.push({
      id: 'monk-tool-proficiency',
      name: 'Competenza negli strumenti',
      description:
        'Scegli un tipo di strumenti da artigiano o uno strumento musicale nel quale ottieni competenza.',
      minLevel: 1,
      countByLevel: [{ level: 1, count: 1 }],
      options: [...artisanTools, ...musicalInstruments],
      effect: 'tool-proficiency',
    });
  if (klass.id === 'monk' && subclassId === 'Via del Kensei')
    choices.push({
      id: 'monk-kensei-artisan-tool',
      name: 'Via del pennello',
      description: 'Scegli una competenza da artigiano concessa dalla sottoclasse.',
      minLevel: 3,
      countByLevel: [{ level: 3, count: 1 }],
      options: [
        {
          id: 'calligrapher-tools',
          name: 'Scorte da calligrafo',
          description: 'Strumento da artigiano',
          kind: 'tool',
        },
        {
          id: 'painter-tools',
          name: 'Scorte da pittore',
          description: 'Strumento da artigiano',
          kind: 'tool',
        },
      ],
      effect: 'tool-proficiency',
    });
  return choices;
}

export function subclassAvailableAtLevel(
  klass: CharacterClass | undefined,
  level: number,
): boolean {
  return !!klass && level >= klass.subclassLevel;
}

export function classFeatureChoicesFor(
  klass: CharacterClass | undefined,
  subclassId: string,
): ClassFeatureChoice[] {
  if (!klass) return [];
  const subclassChoices = (klass.subclassFeatures ?? [])
    .filter((featureSet) => featureSet.subclassId === subclassId)
    .flatMap((featureSet) => featureSet.choices);
  const configured = [...(klass.featureChoices ?? []), ...subclassChoices];
  const configuredIds = new Set(configured.map((choice) => choice.id));
  return [
    ...configured,
    ...rulesChoices(klass, subclassId).filter((choice) => !configuredIds.has(choice.id)),
  ];
}

export function activeClassFeatureChoices(
  klass: CharacterClass | undefined,
  level: number,
  subclassId: string,
  selections: Record<string, string[]> = {},
): ClassFeatureChoice[] {
  return classFeatureChoicesFor(klass, subclassId)
    .filter((choice) => choice.minLevel <= level)
    .filter(
      (choice) =>
        !choice.requiresSelection ||
        (selections[choice.requiresSelection.choiceId] ?? []).includes(
          choice.requiresSelection.optionId,
        ),
    )
    .map((choice) => ({
      ...choice,
      options: choice.options.filter(
        (option) =>
          (option.minLevel ?? choice.minLevel) <= level &&
          (!option.requiresSelection ||
            (selections[option.requiresSelection.choiceId] ?? []).includes(
              option.requiresSelection.optionId,
            )),
      ),
    }));
}

export function classFeatureChoiceCount(choice: ClassFeatureChoice, level: number): number {
  return (
    [...choice.countByLevel].sort((a, b) => b.level - a.level).find((entry) => entry.level <= level)
      ?.count ?? 0
  );
}

export function normalizeClassProgression(
  draft: Pick<CharacterDraft, 'level' | 'subclassId' | 'classFeatureChoices'> &
    Partial<Pick<CharacterDraft, 'spellIds'>>,
  klass: CharacterClass | undefined,
): Pick<CharacterDraft, 'subclassId' | 'classFeatureChoices'> {
  const subclassId =
    subclassAvailableAtLevel(klass, draft.level) && klass?.subclasses.includes(draft.subclassId)
      ? draft.subclassId
      : '';
  const choices = activeClassFeatureChoices(
    klass,
    draft.level,
    subclassId,
    draft.classFeatureChoices,
  );
  const classFeatureChoices = choices.reduce<Record<string, string[]>>((normalized, choice) => {
    const validOptions = new Set(
      choice.options
        .filter(
          (option) => !choice.requiresKnownSpell || (draft.spellIds ?? []).includes(option.id),
        )
        .map((option) => option.id),
    );
    const rawSelected = draft.classFeatureChoices?.[choice.id] ?? [];
    const excludedOptions = new Set(
      (choice.exclusiveWithChoices ?? []).flatMap((choiceId) => normalized[choiceId] ?? []),
    );
    const selected = (choice.repeatable ? [...rawSelected] : [...new Set(rawSelected)])
      .filter((optionId) => validOptions.has(optionId) && !excludedOptions.has(optionId))
      .slice(0, classFeatureChoiceCount(choice, draft.level));
    normalized[choice.id] = selected;
    return normalized;
  }, {});
  return { subclassId, classFeatureChoices };
}

function inferredActivations(description: string): FeatureActivation[] {
  const text = description.toLocaleLowerCase('it');
  const activations: FeatureActivation[] = [];
  if (text.includes('azione bonus')) activations.push('bonus-action');
  if (text.includes('reazione')) activations.push('reaction');
  if (/come azione|usare l['’]azione|effettui l['’]azione/.test(text)) activations.push('action');
  return activations.length ? activations : ['passive'];
}

function featureId(...parts: string[]): string {
  return parts
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Costruisce la lista completa mostrata in scheda esclusivamente da catalogo e scelte salvate. */
export function acquiredCharacterFeatures(
  draft: Pick<CharacterDraft, 'level' | 'subclassId' | 'classFeatureChoices'>,
  klass: CharacterClass | undefined,
  ancestry: Ancestry | undefined,
): CharacterFeature[] {
  const ancestryFeatures: CharacterFeature[] = (ancestry?.traitDetails ?? []).map((trait) => ({
    id: featureId('ancestry', ancestry?.id ?? '', trait.name),
    sourceType: 'ancestry',
    sourceName: ancestry?.name ?? '',
    level: 1,
    name: trait.name,
    description: trait.effect,
    activations: inferredActivations(trait.effect),
  }));
  const classFeatures: CharacterFeature[] = (klass?.classProgression ?? [])
    .filter((feature) => feature.level <= draft.level)
    .map((feature) => ({
      ...feature,
      id: featureId('class', klass?.id ?? '', String(feature.level), feature.name),
      sourceType: 'class',
      sourceName: klass?.name ?? '',
      activations: feature.activations ?? inferredActivations(feature.description),
    }));
  const progression = (klass?.subclassProgressions ?? []).find(
    (candidate) => candidate.subclassId === draft.subclassId,
  );
  const subclassFeatures: CharacterFeature[] = (progression?.features ?? [])
    .filter((feature) => feature.level <= draft.level)
    .map((feature) => ({
      ...feature,
      id: featureId(
        'subclass',
        klass?.id ?? '',
        draft.subclassId,
        String(feature.level),
        feature.name,
      ),
      sourceType: 'subclass',
      sourceName: draft.subclassId,
      activations: feature.activations ?? inferredActivations(feature.description),
    }));
  const choiceFeatures: CharacterFeature[] = activeClassFeatureChoices(
    klass,
    draft.level,
    draft.subclassId,
    draft.classFeatureChoices,
  ).flatMap((choice) => {
    const selected = new Set(draft.classFeatureChoices?.[choice.id] ?? []);
    return choice.options
      .filter((option) => selected.has(option.id))
      .map((option) => ({
        id: featureId('choice', choice.id, option.id),
        sourceType: 'choice' as const,
        sourceName: choice.name,
        level: option.minLevel ?? choice.minLevel,
        name: option.name,
        description: option.description,
        activations: option.activations ?? inferredActivations(option.description),
        resource: option.resource,
        resourceCost: option.resourceCost,
      }));
  });
  return [...ancestryFeatures, ...classFeatures, ...subclassFeatures, ...choiceFeatures];
}
