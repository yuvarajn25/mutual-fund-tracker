import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { AuthService } from "./auth/auth.service";

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const session = await authService.getSession();
  if (!session) {
    router.navigate(["/signin"]);
    return false;
  }

  return true;
};
