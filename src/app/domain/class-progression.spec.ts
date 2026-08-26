import { describe, expect, it } from 'vitest';
import { CharacterClass } from './models';
import {
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
});
