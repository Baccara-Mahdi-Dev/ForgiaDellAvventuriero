import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'forgia-color-theme';
  private readonly preference = signal<ColorTheme | null>(this.savedPreference());
  private readonly systemDark = signal(this.systemPrefersDark());
  private readonly mediaQuery =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');

  readonly theme = computed<ColorTheme>(
    () => this.preference() ?? (this.systemDark() ? 'dark' : 'light'),
  );

  constructor() {
    this.apply(this.theme());
    this.mediaQuery?.addEventListener('change', this.onSystemThemeChange);
  }

  toggle(): void {
    const next: ColorTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.preference.set(next);
    localStorage.setItem(this.storageKey, next);
    this.apply(next);
  }

  private readonly onSystemThemeChange = (event: MediaQueryListEvent): void => {
    this.systemDark.set(event.matches);
    if (this.preference() === null) this.apply(event.matches ? 'dark' : 'light');
  };

  private savedPreference(): ColorTheme | null {
    if (typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem(this.storageKey);
    return saved === 'light' || saved === 'dark' ? saved : null;
  }

  private systemPrefersDark(): boolean {
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  private apply(theme: ColorTheme): void {
    this.document.documentElement.dataset['theme'] = theme;
    this.document.documentElement.style.colorScheme = theme;
    const themeColor = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute('content', theme === 'dark' ? '#1f1814' : '#fffaf2');
  }
}
