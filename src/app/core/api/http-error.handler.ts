import { HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { MessageService } from "primeng/api";

@Injectable({ providedIn: 'root' })
export class HttpErrorHandler {
  private messageService = inject(MessageService);

  handleError(error: HttpErrorResponse, context?: string): string {
    let userMessage = 'Une erreur est survenue';

    if (error.status === 0) {
      userMessage = 'Impossible de se connecter au serveur';
    } else if (error.status >= 400 && error.status < 500) {
      const apiError = error.error;
      if (apiError?.message) {
        userMessage = apiError.message;
      } else if (error.status === 401) {
        userMessage = 'Session expirée. Veuillez vous reconnecter';
      } else if (error.status === 403) {
        userMessage = 'Accès refusé';
      } else if (error.status === 404) {
        userMessage = 'Ressource non trouvée';
      }
    } else if (error.status >= 500) {
      userMessage = 'Erreur serveur. Veuillez réessayer plus tard';
    }

    const fullMessage = context ? `${context}: ${userMessage}` : userMessage;
    
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: fullMessage,
      life: 5000
    });

    return userMessage;
  }
}