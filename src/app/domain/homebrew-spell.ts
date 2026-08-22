import { HomebrewSpell, Spell } from './models';

export function asSpell(homebrew: HomebrewSpell): Spell {
  return {
    id: homebrew.id,
    name: homebrew.name,
    description: homebrew.description,
    source: 'SRD',
    level: homebrew.level,
    school: homebrew.school,
    classes: [],
    castingTime: { amount: 1, unit: homebrew.castingTime },
    duration: { unit: 'special', concentration: false, text: homebrew.duration },
    components: homebrew.components.join(', '),
    damage: homebrew.damage,
  };
}
