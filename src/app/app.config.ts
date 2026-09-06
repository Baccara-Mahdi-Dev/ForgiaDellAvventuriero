import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTaiga } from '@taiga-ui/core';
import { CatalogService } from './core/catalog.service';
import { CHARACTER_REPOSITORY } from './character/application/character.repository';
import { BrowserCharacterRepository } from './character/data-access/browser-character.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideTaiga(),
    provideRouter(routes),
    provideAppInitializer(() => inject(CatalogService).load()),
    { provide: CHARACTER_REPOSITORY, useClass: BrowserCharacterRepository },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
