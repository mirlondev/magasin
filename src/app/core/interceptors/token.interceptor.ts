import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Récupérer le token
  const token = authService.getToken();

  // Cloner la requête et ajouter le token si disponible
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Traiter la requête
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Gérer les erreurs d'authentification
      if (error.status === 401) {
        // Token expiré ou invalide
        authService.logout();
        router.navigate(['/login'], { 
          queryParams: { sessionExpired: true } 
        });
      }
      
      return throwError(() => error);
    })
  );
};