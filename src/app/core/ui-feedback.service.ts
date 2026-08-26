import { Injectable, inject } from '@angular/core';
import { TuiDialogService, TuiNotificationService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error';

const APPEARANCE: Record<FeedbackKind, string> = {
  info: 'info',
  success: 'positive',
  warning: 'warning',
  error: 'negative',
};

const LABEL: Record<FeedbackKind, string> = {
  info: 'Informazione',
  success: 'Operazione completata',
  warning: 'Attenzione',
  error: 'Operazione non riuscita',
};

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  private readonly notifications = inject(TuiNotificationService);
  private readonly dialogs = inject(TuiDialogService);

  show(message: string, kind: FeedbackKind = 'info', label = LABEL[kind], duration?:number): void {
     const _d = duration??3000;
    this.notifications
      .open(message, {
        appearance: APPEARANCE[kind],
        label,
        autoClose: kind === 'error' ? 4500 : _d,
        closable: true,
      })
      .subscribe();
  }

  info(message: string, label?: string, duration?:number): void {
    this.show(message, 'info', label, duration);
  }

  success(message: string, label?: string, duration?:number): void {
    this.show(message, 'success', label, duration);
  }

  warning(message: string, label?: string, duration?:number): void {
    this.show(message, 'warning', label, duration);
  }

  error(message: string, label?: string, duration?:number): void {
    this.show(message, 'error', label, duration);
  }

  confirmDelete(name: string, customContent?:string): Promise<boolean> {
    const _c:string = customContent?.length?customContent:`Il personaggio “${name}” verrà rimosso da questo dispositivo.`;
    return firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: 'Eliminare definitivamente?',
        size: 's',
        data: {
          content: _c,
          yes: 'Elimina',
          no: 'Annulla',
          appearance: 'negative',
        },
      }),
      { defaultValue: false },
    );
  }
}
