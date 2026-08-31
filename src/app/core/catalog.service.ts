import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CatalogData, CatalogFiles, CatalogManifest } from '../domain/catalog';
import {
  Ancestry,
  Background,
  CharacterClass,
  EquipmentItem,
  Feat,
  Spell,
  Subclass,
} from '../domain/models';

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
    const [
      ancestries,
      classes,
      backgrounds,
      feats,
      spells,
      equipment,
      additionalEquipment,
      subclasses,
    ] = await Promise.all([
      path<Ancestry>('ancestries'),
      path<CharacterClass>('classes'),
      path<Background>('backgrounds'),
      path<Feat>('feats'),
      path<Spell>('spells'),
      path<EquipmentItem>('equipment'),
      manifest.additionalEquipment
        ? firstValueFrom(
            this.http.get<EquipmentItem[]>(`${DATA_ROOT}/${manifest.additionalEquipment.file}`),
          )
        : Promise.resolve([]),
      manifest.additionalCatalogs?.subclasses
        ? firstValueFrom(
            this.http.get<Subclass[]>(
              `${DATA_ROOT}/${manifest.additionalCatalogs.subclasses.file}`,
            ),
          )
        : Promise.resolve([]),
    ]);
    if (
      additionalEquipment.length !== (manifest.additionalEquipment?.count ?? 0) ||
      new Set([...equipment, ...additionalEquipment].map((item) => item.id)).size !==
        equipment.length + additionalEquipment.length
    )
      throw new Error('Catalogo degli oggetti magici non valido.');
    if (
      subclasses.length !== (manifest.additionalCatalogs?.subclasses?.count ?? 0) ||
      new Set(subclasses.map((item) => item.id)).size !== subclasses.length
    )
      throw new Error('Catalogo delle sottoclassi non valido.');

    const rawData: CatalogData = {
      manifest,
      ancestries,
      classes,
      backgrounds,
      feats,
      spells,
      equipment: [...equipment, ...additionalEquipment],
    };
    this.assertCatalog(rawData);

    const visibleSubclasses = new Map<string, Set<string>>();
    for (const subclass of this.visible(subclasses)) {
      const names = visibleSubclasses.get(subclass.classId) ?? new Set<string>();
      names.add(subclass.name);
      visibleSubclasses.set(subclass.classId, names);
    }
    const visibleClasses = this.visible(classes).map((klass) => {
      const names = visibleSubclasses.get(klass.id);
      return names
        ? { ...klass, subclasses: klass.subclasses.filter((name) => names.has(name)) }
        : klass;
    });

    this.value.set({
      manifest,
      ancestries: this.visible(ancestries),
      classes: visibleClasses,
      backgrounds: this.visible(backgrounds),
      feats: this.visible(feats),
      spells: this.visible(spells),
      equipment: [...equipment, ...additionalEquipment],
    });
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

  private visible<T extends { isHidden?: boolean }>(records: readonly T[]): T[] {
    return environment.personalBuild
      ? [...records]
      : records.filter((record) => record.isHidden !== true);
  }

  private assertCatalog(data: CatalogData): void {
    const keys = Object.keys(data.manifest.files) as (keyof CatalogFiles)[];
    for (const key of keys) {
      const records = data[key];
      const expected =
        key === 'equipment'
          ? data.manifest.catalog[key] + (data.manifest.additionalEquipment?.count ?? 0)
          : data.manifest.catalog[key];
      if (!Array.isArray(records) || records.length !== expected) {
        throw new Error(`Conteggio non valido nel catalogo ${key}.`);
      }
      const ids = records.map((record) => record.id);
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
        throw new Error(`ID mancanti o duplicati nel catalogo ${key}.`);
      }
    }
  }
}
