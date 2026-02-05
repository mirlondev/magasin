import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

/**
 * Global HTTP Error Interceptor
 * Catches all HTTP errors and displays user-friendly messages via PrimeNG Toast
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Une erreur est survenue';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Erreur: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 0) {
          errorMessage = 'Impossible de se connecter au serveur';
        } else if (error.status === 401) {
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          errorMessage = 'Accès refusé. Permissions insuffisantes.';
        } else if (error.status === 404) {
          errorMessage = 'Ressource non trouvée';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else {
          errorMessage = `Erreur ${error.status}: ${error.statusText}`;
        }
      }

      // Display error toast
      messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: errorMessage,
        life: 5000
      });

      return throwError(() => error);
    })
  );
};
