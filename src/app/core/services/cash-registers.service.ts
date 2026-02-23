import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, map, tap, of } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";
import { ApiResponse, CashRegister, CashRegisterRequest, PaginatedResponse } from "../models";

@Injectable({ providedIn: 'root' })
export class CashRegistersService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  cashRegisters = signal<CashRegister[]>([]);
  selectedCashRegister = signal<CashRegister | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getCashRegistersByStore(storeId: string): Observable<CashRegister[]> {
    this.loading.set(true);
    this.error.set(null);
    
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`stores/${storeId}/cash-registers`)
    ).pipe(
      map(response => response.data || []),
      tap(registers => {
        this.cashRegisters.set(registers);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.error.set(this.errorHandler.handleError(error, 'Chargement des caisses'));
        return of([]);
      })
    );
  }

  getActiveCashRegistersByStore(storeId: string): Observable<CashRegister[]> {
    this.loading.set(true);
    this.error.set(null);
    
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`stores/${storeId}/cash-registers?isActive=true`)
    ).pipe(
      map(response => response.data || []),
      tap(registers => {
        this.cashRegisters.set(registers);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.error.set(this.errorHandler.handleError(error, 'Chargement des caisses actives'));
        return of([]);
      })
    );
  }

  getCashRegisterById(cashRegisterId: string): Observable<CashRegister | null> {
    this.loading.set(true);
    this.error.set(null);
    
    return this.http.get<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}`)
    ).pipe(
      map(response => response.data),
      tap(register => {
        this.selectedCashRegister.set(register);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.error.set(this.errorHandler.handleError(error, 'Chargement de la caisse'));
        return of(null);
      })
    );
  }

  createCashRegister(request: CashRegisterRequest): Observable<CashRegister> {
    this.loading.set(true);
    this.error.set(null);
    
    return this.http.post<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint('cash-registers'),
      request
    ).pipe(
      map(response => response.data),
      tap(newRegister => {
        this.cashRegisters.update(regs => [...regs, newRegister]);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.error.set(this.errorHandler.handleError(error, 'Création de la caisse'));
        throw error;
      })
    );
  }

  updateCashRegister(cashRegisterId: string, request: CashRegisterRequest): Observable<CashRegister> {
    this.error.set(null);
    
    return this.http.put<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}`),
      request
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? updated : r)
        );
        if (this.selectedCashRegister()?.cashRegisterId === cashRegisterId) {
          this.selectedCashRegister.set(updated);
        }
      }),
      catchError(error => {
        this.error.set(this.errorHandler.handleError(error, 'Mise à jour de la caisse'));
        throw error;
      })
    );
  }

  deleteCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}`)
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.filter(r => r.cashRegisterId !== cashRegisterId)
        );
        if (this.selectedCashRegister()?.cashRegisterId === cashRegisterId) {
          this.selectedCashRegister.set(null);
        }
      }),
      catchError(error => {
        this.error.set(this.errorHandler.handleError(error, 'Suppression de la caisse'));
        throw error;
      })
    );
  }

  activateCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.patch<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}/activate`),
      {}
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? { ...r, isActive: true } : r)
        );
        if (this.selectedCashRegister()?.cashRegisterId === cashRegisterId) {
          this.selectedCashRegister.update(reg => reg ? { ...reg, isActive: true } : null);
        }
      }),
      catchError(error => {
        this.error.set(this.errorHandler.handleError(error, 'Activation de la caisse'));
        throw error;
      })
    );
  }

  deactivateCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.patch<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}/deactivate`),
      {}
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? { ...r, isActive: false } : r)
        );
        if (this.selectedCashRegister()?.cashRegisterId === cashRegisterId) {
          this.selectedCashRegister.update(reg => reg ? { ...reg, isActive: false } : null);
        }
      }),
      catchError(error => {
        this.error.set(this.errorHandler.handleError(error, 'Désactivation de la caisse'));
        throw error;
      })
    );
  }

  isCashRegisterAvailable(cashRegisterId: string): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(
      this.apiConfig.getEndpoint(`cash-registers/${cashRegisterId}/available`)
    ).pipe(
      map(response => response.data ?? true),
      catchError(() => of(true))
    );
  }

  getCashRegistersWithOpenShifts(storeId: string): Observable<CashRegister[]> {
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`stores/${storeId}/cash-registers/with-open-shifts`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des caisses occupées');
        return of([]);
      })
    );
  }
}