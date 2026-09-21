import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    title: "Forgia dell'avventuriero",
  },
  {
    path: 'crea/:id/:step',
    loadComponent: () =>
      import('./features/wizard/wizard.component').then((m) => m.WizardComponent),
    title: "Creazione · Forgia dell'avventuriero",
  },
  {
    path: 'card-incantesimo',
    loadComponent: () =>
      import('./features/spell-cards/spell-cards.component').then((m) => m.SpellCardsComponent),
    title: "Card incantesimo · Forgia dell'avventuriero",
  },
  { path: 'cards', redirectTo: 'card-incantesimo', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
