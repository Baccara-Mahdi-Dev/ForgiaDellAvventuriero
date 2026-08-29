import { describe, expect, it } from 'vitest';
import { CharacterClass } from './models';
import {
  acquiredCharacterFeatures,
  activeClassFeatureChoices,
  classFeatureChoiceCount,
  normalizeClassProgression,
  subclassAvailableAtLevel,
} from './class-progression';

const fighter: CharacterClass = {
  id: 'fighter',
  name: 'Guerriero',
  description: '',
  source: 'PHB',
  hitDie: 10,
  primary: 'str',
  saves: ['str', 'con'],
  subclassLevel: 3,
  subclasses: ['Campione', 'Maestro di Battaglia'],
  skillChoices: 2,
  skillOptions: [],
  subclassFeatures: [
    {
      subclassId: 'Maestro di Battaglia',
      choices: [
        {
          id: 'maneuvers',
          name: 'Manovre',
          description: '',
          minLevel: 3,
          countByLevel: [
            { level: 3, count: 3 },
            { level: 7, count: 5 },
          ],
          options: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, description: id })),
        },
      ],
    },
  ],
};

describe('progressione di classe data-driven', () => {
  it('sblocca la sottoclasse al livello dichiarato dalla classe', () => {
    expect(subclassAvailableAtLevel(fighter, 2)).toBe(false);
    expect(subclassAvailableAtLevel(fighter, 3)).toBe(true);
    expect(subclassAvailableAtLevel({ ...fighter, id: 'wizard', subclassLevel: 2 }, 1)).toBe(false);
    expect(subclassAvailableAtLevel({ ...fighter, id: 'sorcerer', subclassLevel: 1 }, 1)).toBe(
      true,
    );
  });

  it('attiva soltanto le scelte della sottoclasse selezionata', () => {
    expect(activeClassFeatureChoices(fighter, 3, 'Campione')).toEqual([]);
    expect(activeClassFeatureChoices(fighter, 3, 'Maestro di Battaglia')).toHaveLength(1);
  });

  it('usa la progressione dichiarata per il numero di opzioni', () => {
    const choice = fighter.subclassFeatures![0].choices[0];
    expect(classFeatureChoiceCount(choice, 3)).toBe(3);
    expect(classFeatureChoiceCount(choice, 7)).toBe(5);
  });

  it('mostra le opzioni con requisito soltanto dal livello previsto', () => {
    const runeFighter: CharacterClass = {
      ...fighter,
      subclassFeatures: [
        {
          subclassId: 'Maestro di Battaglia',
          choices: [
            {
              id: 'runes',
              name: 'Rune',
              description: '',
              minLevel: 3,
              countByLevel: [
                { level: 3, count: 1 },
                { level: 7, count: 2 },
              ],
              options: [
                { id: 'cloud', name: 'Nuvole', description: '' },
                { id: 'hill', name: 'Collina', description: '', minLevel: 7 },
              ],
            },
          ],
        },
      ],
    };
    expect(
      activeClassFeatureChoices(runeFighter, 3, 'Maestro di Battaglia')[0].options,
    ).toHaveLength(1);
    expect(
      activeClassFeatureChoices(runeFighter, 7, 'Maestro di Battaglia')[0].options,
    ).toHaveLength(2);
  });

  it('rimuove sottoclasse e scelte diventate invalide abbassando il livello', () => {
    expect(
      normalizeClassProgression(
        {
          level: 2,
          subclassId: 'Maestro di Battaglia',
          classFeatureChoices: { maneuvers: ['a', 'b', 'c'] },
        },
        fighter,
      ),
    ).toEqual({ subclassId: '', classFeatureChoices: {} });
  });

  it('limita e ripulisce le selezioni importate', () => {
    expect(
      normalizeClassProgression(
        {
          level: 3,
          subclassId: 'Maestro di Battaglia',
          classFeatureChoices: { maneuvers: ['a', 'a', 'x', 'b', 'c', 'd'] },
        },
        fighter,
      ).classFeatureChoices,
    ).toEqual({ maneuvers: ['a', 'b', 'c'] });
  });

  it('aggiunge maestrie e strumenti alla progressione di Bardo e Ladro', () => {
    const bard = {
      ...fighter,
      id: 'bard',
      name: 'Bardo',
      subclassLevel: 3,
      subclasses: ['Collegio della Sapienza'],
    };
    const bardChoices = activeClassFeatureChoices(bard, 3, 'Collegio della Sapienza');
    expect(bardChoices.map((choice) => choice.id)).toEqual(
      expect.arrayContaining([
        'bard-musical-instruments',
        'bard-expertise',
        'bard-lore-bonus-skills',
      ]),
    );
    expect(
      classFeatureChoiceCount(
        bardChoices.find((choice) => choice.id === 'bard-expertise')!,
        10,
      ),
    ).toBe(4);

    const rogue = { ...fighter, id: 'rogue', name: 'Ladro', subclasses: ['Assassino'] };
    const expertise = activeClassFeatureChoices(rogue, 6, 'Assassino').find(
      (choice) => choice.id === 'rogue-expertise',
    );
    expect(expertise?.options.some((option) => option.id === 'thieves-tools')).toBe(true);
    expect(classFeatureChoiceCount(expertise!, 6)).toBe(4);
  });

  it('offre al Monaco la competenza iniziale negli strumenti', () => {
    const monk = {
      ...fighter,
      id: 'monk',
      name: 'Monaco',
      subclasses: ['Via della Mano Aperta'],
    };
    const toolChoice = activeClassFeatureChoices(monk, 1, '').find(
      (choice) => choice.id === 'monk-tool-proficiency',
    );

    expect(toolChoice).toBeDefined();
    expect(classFeatureChoiceCount(toolChoice!, 1)).toBe(1);
    expect(toolChoice?.options.some((option) => option.id.startsWith('artisan-'))).toBe(true);
    expect(toolChoice?.options.some((option) => option.id.startsWith('instrument-'))).toBe(true);
  });

  it('attiva una scelta dipendente soltanto quando è selezionato il beneficio richiesto', () => {
    const paladin: CharacterClass = {
      ...fighter,
      id: 'paladin',
      name: 'Paladino',
      featureChoices: [
        {
          id: 'style',
          name: 'Stile',
          description: '',
          minLevel: 2,
          countByLevel: [{ level: 2, count: 1 }],
          options: [
            { id: 'defense', name: 'Difesa', description: '' },
            { id: 'blessed', name: 'Benedetto', description: '' },
          ],
        },
        {
          id: 'cantrips',
          name: 'Trucchetti',
          description: '',
          minLevel: 2,
          countByLevel: [{ level: 2, count: 2 }],
          requiresSelection: { choiceId: 'style', optionId: 'blessed' },
          options: ['light', 'guidance'].map((id) => ({ id, name: id, description: id })),
        },
      ],
    };

    expect(activeClassFeatureChoices(paladin, 2, '', { style: ['defense'] })).toHaveLength(1);
    expect(activeClassFeatureChoices(paladin, 2, '', { style: ['blessed'] })).toHaveLength(2);
  });

  it('filtra le opzioni che richiedono una specifica scelta precedente', () => {
    const warlock: CharacterClass = {
      ...fighter,
      id: 'warlock',
      name: 'Warlock',
      featureChoices: [
        {
          id: 'pact',
          name: 'Dono',
          description: '',
          minLevel: 3,
          countByLevel: [{ level: 3, count: 1 }],
          options: [
            { id: 'blade', name: 'Lama', description: '' },
            { id: 'tome', name: 'Tomo', description: '' },
          ],
        },
        {
          id: 'invocations',
          name: 'Suppliche',
          description: '',
          minLevel: 2,
          countByLevel: [{ level: 2, count: 2 }],
          options: [
            { id: 'sight', name: 'Vista', description: '' },
            {
              id: 'book',
              name: 'Libro',
              description: '',
              requiresSelection: { choiceId: 'pact', optionId: 'tome' },
            },
          ],
        },
      ],
    };

    const withBlade = activeClassFeatureChoices(warlock, 3, '', { pact: ['blade'] });
    const withTome = activeClassFeatureChoices(warlock, 3, '', { pact: ['tome'] });
    expect(withBlade.find((choice) => choice.id === 'invocations')?.options).toHaveLength(1);
    expect(withTome.find((choice) => choice.id === 'invocations')?.options).toHaveLength(2);
    expect(
      normalizeClassProgression(
        {
          level: 3,
          subclassId: '',
          classFeatureChoices: { pact: ['blade'], invocations: ['book'] },
        },
        warlock,
      ).classFeatureChoices,
    ).toEqual({ pact: ['blade'], invocations: [] });
  });

  it('mantiene duplicati soltanto per una scelta esplicitamente ripetibile', () => {
    const repeatable: CharacterClass = {
      ...fighter,
      featureChoices: [
        {
          id: 'repeatable-choice',
          name: 'Scelta ripetibile',
          description: '',
          minLevel: 1,
          countByLevel: [{ level: 1, count: 2 }],
          repeatable: true,
          options: [{ id: 'same', name: 'Stessa opzione', description: '' }],
        },
      ],
      subclassFeatures: [],
    };
    expect(
      normalizeClassProgression(
        {
          level: 1,
          subclassId: '',
          classFeatureChoices: { 'repeatable-choice': ['same', 'same'] },
        },
        repeatable,
      ).classFeatureChoices,
    ).toEqual({ 'repeatable-choice': ['same', 'same'] });
  });

  it('ripulisce in modo deterministico opzioni esclusive tra gruppi diversi', () => {
    const exclusive: CharacterClass = {
      ...fighter,
      featureChoices: [
        {
          id: 'first',
          name: 'Prima',
          description: '',
          minLevel: 1,
          countByLevel: [{ level: 1, count: 1 }],
          options: [{ id: 'shared', name: 'Comune', description: '' }],
        },
        {
          id: 'second',
          name: 'Seconda',
          description: '',
          minLevel: 1,
          countByLevel: [{ level: 1, count: 1 }],
          exclusiveWithChoices: ['first'],
          options: [{ id: 'shared', name: 'Comune', description: '' }],
        },
      ],
      subclassFeatures: [],
    };
    expect(
      normalizeClassProgression(
        {
          level: 1,
          subclassId: '',
          classFeatureChoices: { first: ['shared'], second: ['shared'] },
        },
        exclusive,
      ).classFeatureChoices,
    ).toEqual({ first: ['shared'], second: [] });
  });

  it('costruisce dalla progressione le feature ottenute e conserva risorsa e attivazione', () => {
    const klass: CharacterClass = {
      ...fighter,
      classProgression: [
        {
          level: 2,
          name: 'Risorsa attiva',
          description: 'Usa una capacità.',
          activations: ['bonus-action'],
          resource: 'Punti prova',
          resourceCost: '1 punto',
        },
      ],
      subclassProgressions: [
        {
          subclassId: 'Maestro di Battaglia',
          sourceBook: 'PHB',
          sourcePages: { from: 1, to: 1 },
          features: [{ level: 3, name: 'Reazione', description: 'Come reazione intervieni.' }],
        },
      ],
    };
    const features = acquiredCharacterFeatures(
      { level: 3, subclassId: 'Maestro di Battaglia', classFeatureChoices: {} },
      klass,
      undefined,
    );
    expect(features.map((feature) => feature.name)).toEqual(['Risorsa attiva', 'Reazione']);
    expect(features[0]).toMatchObject({
      activations: ['bonus-action'],
      resource: 'Punti prova',
      resourceCost: '1 punto',
    });
    expect(features[1].activations).toEqual(['reaction']);
  });
});
