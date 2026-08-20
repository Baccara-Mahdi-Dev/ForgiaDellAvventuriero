import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogData, CatalogFiles, CatalogManifest } from '../domain/catalog';
import { Ancestry, Background, CharacterClass, EquipmentItem, Feat, Spell } from '../domain/models';

const DATA_ROOT = 'data/v1';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly value = signal<CatalogData | null>(null);
  readonly data = this.value.asReadonly();

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    const manifest = await firstValueFrom(
      this.http.get<CatalogManifest>(`${DATA_ROOT}/manifest.json`),
    );
    this.assertManifest(manifest);
    const path = <T>(key: keyof CatalogFiles) =>
      firstValueFrom(this.http.get<T[]>(`${DATA_ROOT}/${manifest.files[key]}`));
    const [ancestries, classes, backgrounds, feats, spells, equipment] = await Promise.all([
      path<Ancestry>('ancestries'),
      path<CharacterClass>('classes'),
      path<Background>('backgrounds'),
      path<Feat>('feats'),
      path<Spell>('spells'),
      path<EquipmentItem>('equipment'),
    ]);
    const data: CatalogData = {
      manifest,
      ancestries,
      classes,
      backgrounds,
      feats,
      spells,
      equipment,
    };
    this.assertCatalog(data);
    this.value.set(data);
  }

  requireData(): CatalogData {
    const data = this.value();
    if (!data) throw new Error('Il catalogo non è ancora disponibile.');
    return data;
  }

  private assertManifest(value: CatalogManifest): void {
    if (
      !value ||
      value.schemaVersion !== 1 ||
      !value.dataVersion ||
      !value.files ||
      !value.catalog
    ) {
      throw new Error('Manifest del catalogo non valido.');
    }
  }

  private assertCatalog(data: CatalogData): void {
    const keys = Object.keys(data.manifest.files) as (keyof CatalogFiles)[];
    for (const key of keys) {
      const records = data[key];
      if (!Array.isArray(records) || records.length !== data.manifest.catalog[key]) {
        throw new Error(`Conteggio non valido nel catalogo ${key}.`);
      }
      const ids = records.map((record) => record.id);
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
        throw new Error(`ID mancanti o duplicati nel catalogo ${key}.`);
      }
    }
  }
}
