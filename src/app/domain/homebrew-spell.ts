import { HomebrewSpell, Spell } from './models';

export function asSpell(homebrew: HomebrewSpell): Spell {
  return {
    id: homebrew.id,
    name: homebrew.name,
    description: homebrew.description,
    source: 'SRD',
    homebrew: true,
    level: homebrew.level,
    school: homebrew.school,
    classes: [],
    castingTime: { amount: 1, unit: homebrew.castingTime },
    duration: {
      unit: 'special',
      concentration: homebrew.concentration,
      text: homebrew.duration,
    },
    components: homebrew.components
      .map((component) =>
        component === 'M' && homebrew.materials?.length
          ? `M (${homebrew.materials.join(', ')})`
          : component,
      )
      .join(', '),
    damage: homebrew.damage,
  };
}
