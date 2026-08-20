# ADR 0002 — Signals e RxJS

Signals possiede lo stato sincrono del wizard e tutti i valori derivati. Le funzioni in `domain/rules.ts` sono pure. RxJS è limitato ai confini asincroni del router; Dexie gestisce le Promise del database. Gli effetti Angular sono usati soltanto per l'autosalvataggio con debounce.
