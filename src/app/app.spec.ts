import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';
import { App } from './app';

const storageMock: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

describe('App', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storageMock,
    });
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
