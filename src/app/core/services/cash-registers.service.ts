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

  // State signals
  cashRegisters = signal<CashRegister[]>([]);
  selectedCashRegister = signal<CashRegister | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Get all cash registers for a store
  getCashRegistersByStore(storeId: string): Observable<CashRegister[]> {
    this.loading.set(true);
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/cash-registers/store/${storeId}`)
    ).pipe(
      map(response => response.data || []),
      tap(registers => {
        this.cashRegisters.set(registers);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement des caisses');
        return of([]);
      })
    );
  }

  // Get active cash registers only
  getActiveCashRegistersByStore(storeId: string): Observable<CashRegister[]> {
    this.loading.set(true);
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/cash-registers/store/${storeId}/active`)
    ).pipe(
      map(response => response.data || []),
      tap(registers => {
        this.cashRegisters.set(registers);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement des caisses actives');
        return of([]);
      })
    );
  }

  // Get cash register by ID
  getCashRegisterById(cashRegisterId: string): Observable<CashRegister | null> {
    this.loading.set(true);
    return this.http.get<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}`)
    ).pipe(
      map(response => response.data),
      tap(register => {
        this.selectedCashRegister.set(register);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la caisse');
        return of(null);
      })
    );
  }

  // Create new cash register
  createCashRegister(request: CashRegisterRequest): Observable<CashRegister> {
    this.loading.set(true);
    return this.http.post<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint('/cash-registers'),
      request
    ).pipe(
      map(response => response.data),
      tap(newRegister => {
        this.cashRegisters.update(regs => [...regs, newRegister]);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la caisse');
        throw error;
      })
    );
  }

  // Update cash register
  updateCashRegister(cashRegisterId: string, request: CashRegisterRequest): Observable<CashRegister> {
    return this.http.put<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}`),
      request
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? updated : r)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Mise à jour de la caisse');
        throw error;
      })
    );
  }

  // Delete cash register
  deleteCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}`)
    ).pipe(
      map(() => { }),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.filter(r => r.cashRegisterId !== cashRegisterId)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de la caisse');
        throw error;
      })
    );
  }

  // Activate cash register
  activateCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.patch<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}/activate`),
      {}
    ).pipe(
      map(() => { }),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? { ...r, isActive: true } : r)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Activation de la caisse');
        throw error;
      })
    );
  }

  // Deactivate cash register
  deactivateCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.patch<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}/deactivate`),
      {}
    ).pipe(
      map(() => { }),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? { ...r, isActive: false } : r)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Désactivation de la caisse');
        throw error;
      })
    );
  }

  // Check if cash register is available (no open shift)
  isCashRegisterAvailable(cashRegisterId: string): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(
      this.apiConfig.getEndpoint(`/shift-reports/cash-register/${cashRegisterId}/open`)
    ).pipe(
      map(response => !response.data), // Si pas de shift ouvert, disponible
      catchError(() => of(true)) // En cas d'erreur, considérer comme disponible
    );
  }
}