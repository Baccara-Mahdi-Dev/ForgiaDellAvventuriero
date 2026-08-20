import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';
import { App } from './app';
describe('App', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideTaiga()],
    }).compileComponents();
  });
  it('crea la shell', () => expect(TestBed.createComponent(App).componentInstance).toBeTruthy());
});
