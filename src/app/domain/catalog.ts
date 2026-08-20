import { Ancestry, Background, CharacterClass, EquipmentItem, Feat, Spell } from './models';

export interface CatalogManifest {
  schemaVersion: number;
  dataVersion: string;
  locale: string;
  ruleset: string;
  catalog: Record<keyof CatalogFiles, number>;
  files: CatalogFiles;
  sources: string[];
}

export interface CatalogFiles {
  ancestries: string;
  classes: string;
  backgrounds: string;
  feats: string;
  spells: string;
  equipment: string;
}

export interface CatalogData {
  manifest: CatalogManifest;
  ancestries: readonly Ancestry[];
  classes: readonly CharacterClass[];
  backgrounds: readonly Background[];
  feats: readonly Feat[];
  spells: readonly Spell[];
  equipment: readonly EquipmentItem[];
}

export type RulesCatalog = Pick<
  CatalogData,
  'ancestries' | 'classes' | 'backgrounds' | 'feats' | 'equipment'
>;
