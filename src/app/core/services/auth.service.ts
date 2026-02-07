import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, map, of, tap } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";
import { ApiResponse, AuthResponse, EmployeeRole, EmployeeRoleResponse, JwtPayload, LoginRequest, User } from "../models";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Signals d'état - initialized with null/false, will be set in constructor
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  // Charger l'utilisateur depuis le localStorage
  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr && userStr !== 'undefined') {
      try {
        const user: User = JSON.parse(userStr);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        console.log('User loaded from storage:', user);
      } catch (e) {
        console.warn('Failed to parse user from storage', e);
        this.clearAuthData();
      }
    } else {
      this.clearAuthData();
    }
  }

  // Stocker les informations d'authentification
  private setAuthData(response: EmployeeRoleResponse): void {
    // Map the flat response to User object
    const userData: User = {
      userId: response.userId,
      username: response.username,
      email: response.email,
      storeId: response.storeId,
      storeName: response.storeName,
      userRole: response.userRole as EmployeeRole
    };
    
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    this.currentUser.set(userData);
    this.isAuthenticated.set(true);
    
    console.log('Auth data set:', { token: response.token.substring(0, 20) + '...', user: userData });
  }

  // Supprimer les informations d'authentification
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  // Méthode pour récupérer le token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Méthode pour vérifier les rôles
  hasRole(requiredRoles: EmployeeRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return requiredRoles.includes(user.userRole);
  }

  // Méthode pour vérifier les permissions spécifiques
  isAdmin(): boolean {
    return this.hasRole([EmployeeRole.ADMIN]);
  }

  isStoreAdmin(): boolean {
    return this.hasRole([EmployeeRole.STORE_ADMIN]);
  }

  isCashier(): boolean {
    return this.hasRole([EmployeeRole.CASHIER]);
  }

  isDepotManager(): boolean {
    return this.hasRole([EmployeeRole.DEPOT_MANAGER]);
  }

  // Login
  login(credentials: LoginRequest): Observable<boolean> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>(
      this.apiConfig.getEndpoint('/auth/login'),
      credentials
    ).pipe(
      map(response => {
        if (response && response.token && response.userId) {
          this.setAuthData(response);
          console.log('Login successful:', response);
          return true;
        } else {
          this.error.set('Échec de l\'authentification');
          return false;
        }
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Connexion');
        this.error.set(errorMsg);
        return of(false);
      }),
      tap(() => {
        this.loading.set(false);
      })
    );
  }

  // Register
  register(userData: any): Observable<boolean> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>(
      this.apiConfig.getEndpoint('/auth/register'),
      userData
    ).pipe(
      map(response => {
        if (response && response.token && response.userId) {
          this.setAuthData(response);
          return true;
        } else {
          this.error.set('Échec de l\'inscription');
          return false;
        }
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Inscription');
        this.error.set(errorMsg);
        return of(false);
      }),
      tap(() => {
        this.loading.set(false);
      })
    );
  }

  // Logout
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  // Refresh token
  refreshToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.post<AuthResponse>(
      this.apiConfig.getEndpoint('/auth/refresh'),
      { token }
    ).pipe(
      map(response => {
        if (response && response.token && response.userId) {
          this.setAuthData(response);
          return true;
        }
        return false;
      }),
      catchError(() => {
        this.clearAuthData();
        return of(false);
      })
    );
  }

  // Update user profile
  updateProfile(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(
      this.apiConfig.getEndpoint(`/users/${userId}`),
      userData
    ).pipe(
      map(response => response),
      tap(updatedUser => {
        const currentUser = this.currentUser();
        if (currentUser) {
          const updated = { ...currentUser, ...updatedUser };
          this.currentUser.set(updated);
          localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour du profil');
        throw error;
      })
    );
  }

  // Decode JWT token
  public decodeToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    return JSON.parse(atob(parts[1])) as JwtPayload;
  }
}