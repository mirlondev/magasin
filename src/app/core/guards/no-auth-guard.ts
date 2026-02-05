import { inject } from "@angular/core";
import { CanActivateFn, CanMatch, CanMatchFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const noAuthGuard: CanMatchFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const  isLoggedIn = authService.isAuthenticated();



  if (isLoggedIn) {
    return false;
  }
  return true;
};
