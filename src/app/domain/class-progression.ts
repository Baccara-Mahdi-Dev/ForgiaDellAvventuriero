import { CharacterClass, CharacterDraft, ClassFeatureChoice, SKILLS } from './models';

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
): ClassFeatureChoice[] {
  return classFeatureChoicesFor(klass, subclassId).filter((choice) => choice.minLevel <= level);
}

export function classFeatureChoiceCount(choice: ClassFeatureChoice, level: number): number {
  return (
    [...choice.countByLevel].sort((a, b) => b.level - a.level).find((entry) => entry.level <= level)
      ?.count ?? 0
  );
}

export function normalizeClassProgression(
  draft: Pick<CharacterDraft, 'level' | 'subclassId' | 'classFeatureChoices'>,
  klass: CharacterClass | undefined,
): Pick<CharacterDraft, 'subclassId' | 'classFeatureChoices'> {
  const subclassId =
    subclassAvailableAtLevel(klass, draft.level) && klass?.subclasses.includes(draft.subclassId)
      ? draft.subclassId
      : '';
  const choices = activeClassFeatureChoices(klass, draft.level, subclassId);
  const classFeatureChoices = Object.fromEntries(
    choices.map((choice) => {
      const validOptions = new Set(choice.options.map((option) => option.id));
      const selected = [...new Set(draft.classFeatureChoices?.[choice.id] ?? [])]
        .filter((optionId) => validOptions.has(optionId))
        .slice(0, classFeatureChoiceCount(choice, draft.level));
      return [choice.id, selected];
    }),
  );
  return { subclassId, classFeatureChoices };
}
