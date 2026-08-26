import { describe, expect, it } from 'vitest';
import {
  attunementLimit,
  battleSmithUsesIntelligence,
  isArtificerSubclass,
} from './artificer-rules';
import { EquipmentItem } from './models';

const magicWeapon: EquipmentItem = {
  id: 'magic-sword',
  name: 'Spada magica',
  category: 'weapon',
  group: 'Armi',
  cost: '—',
  weightKg: 1,
  source: 'SRD',
  magical: true,
};

describe('regole dell’Artificiere', () => {
  it('aumenta gli slot di sintonia ai livelli corretti', () => {
    expect(attunementLimit({ classId: 'fighter', level: 20 })).toBe(3);
    expect(attunementLimit({ classId: 'artificer', level: 9 })).toBe(3);
    expect(attunementLimit({ classId: 'artificer', level: 10 })).toBe(4);
    expect(attunementLimit({ classId: 'artificer', level: 14 })).toBe(5);
    expect(attunementLimit({ classId: 'artificer', level: 18 })).toBe(6);
  });

  it('riconosce i nomi italiano e inglese delle specializzazioni', () => {
    expect(
      isArtificerSubclass(
        { classId: 'artificer', subclassId: 'Fabbro da Battaglia', level: 3 },
        'battleSmith',
      ),
    ).toBe(true);
    expect(
      isArtificerSubclass(
        { classId: 'artificer', subclassId: 'Battle Smith', level: 3 },
        'battleSmith',
      ),
    ).toBe(true);
  });

  it('permette al Battle Smith di disattivare Battle Ready per una singola arma', () => {
    const draft = {
      classId: 'artificer',
      subclassId: 'Fabbro da Battaglia',
      level: 3,
    };
    expect(battleSmithUsesIntelligence(draft, magicWeapon)).toBe(true);
    expect(battleSmithUsesIntelligence(draft, magicWeapon, { useIntelligence: true })).toBe(true);
    expect(battleSmithUsesIntelligence(draft, magicWeapon, { useIntelligence: false })).toBe(false);
    expect(battleSmithUsesIntelligence(draft, { ...magicWeapon, magical: false })).toBe(false);
  });
});
