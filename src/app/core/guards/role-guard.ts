import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";
import { EmployeeRole } from "../models";
import { AuthService } from "../services/auth.service";

export const roleGuard = (allowedRoles: EmployeeRole[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Vérifier si l'utilisateur est authentifié
    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }

    // Vérifier les rôles
    if (authService.hasRole(allowedRoles)) {
      return true;
    }

    // Rediriger vers le dashboard si pas d'autorisation
    router.navigate(['/dashboard']);
    return false;
  };
};