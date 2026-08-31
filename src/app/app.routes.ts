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
  { path: '**', redirectTo: '' },
];
