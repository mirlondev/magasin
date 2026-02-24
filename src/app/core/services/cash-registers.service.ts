import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Observable, catchError, forkJoin, map, of, tap } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";

// src/app/core/services/cash-registers.service.ts

import {
  ApiResponse,
  CashRegister,
  CashRegisterRequest,
  PaginatedResponse,
  CashRegisterStatistics
} from "../models";

interface CashRegisterFilters {
  storeId?: string;
  isActive?: boolean;
  hasOpenShift?: boolean;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class CashRegistersService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State Signals
  cashRegisters = signal<CashRegister[]>([]);
  selectedCashRegister = signal<CashRegister | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Statistics
  statistics = signal<CashRegisterStatistics | null>(null);

  loadCashRegisters(
    page: number = 1,
    pageSize: number = 10,
    filters?: CashRegisterFilters
  ): Observable<PaginatedResponse<CashRegister>> {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      page: page - 1,
      size: pageSize,
      ...filters
    };

    return this.http.get<ApiResponse<PaginatedResponse<CashRegister>>>(
      this.apiConfig.getEndpoint('/cash-registers'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const items = data?.items || [];
        this.cashRegisters.set(items);
        this.total.set(data?.total || 0);
        this.page.set(data?.page + 1);
        this.pageSize.set(data?.size || 10);
        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des caisses');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  getCashRegistersByStore(storeId: string): Observable<CashRegister[]> {
    this.loading.set(true);
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/cash-registers`)
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
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/cash-registers/active`)
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

  getCashRegisterById(cashRegisterId: string): Observable<CashRegister> {
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
        throw error;
      })
    );
  }

  createCashRegister(request: CashRegisterRequest): Observable<CashRegister> {
    this.loading.set(true);
    return this.http.post<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint('/cash-registers'),
      request
    ).pipe(
      map(response => response.data),
      tap(newRegister => {
        this.cashRegisters.update(regs => [newRegister, ...regs]);
        this.total.update(total => total + 1);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Création de la caisse');
        throw error;
      })
    );
  }

  updateCashRegister(
    cashRegisterId: string,
    request: CashRegisterRequest
  ): Observable<CashRegister> {
    this.loading.set(true);
    return this.http.put<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}`),
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
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Mise à jour de la caisse');
        throw error;
      })
    );
  }

  deleteCashRegister(cashRegisterId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}`)
    ).pipe(
      map(response => response.data),
      tap(() => {
        this.cashRegisters.update(regs =>
          regs.filter(r => r.cashRegisterId !== cashRegisterId)
        );
        this.total.update(total => total - 1);
        if (this.selectedCashRegister()?.cashRegisterId === cashRegisterId) {
          this.selectedCashRegister.set(null);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suppression de la caisse');
        throw error;
      })
    );
  }

  activateCashRegister(cashRegisterId: string): Observable<CashRegister> {
    return this.http.patch<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}/activate`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? updated : r)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Activation de la caisse');
        throw error;
      })
    );
  }

  deactivateCashRegister(cashRegisterId: string): Observable<CashRegister> {
    return this.http.patch<ApiResponse<CashRegister>>(
      this.apiConfig.getEndpoint(`/cash-registers/${cashRegisterId}/deactivate`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updated => {
        this.cashRegisters.update(regs =>
          regs.map(r => r.cashRegisterId === cashRegisterId ? updated : r)
        );
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Désactivation de la caisse');
        throw error;
      })
    );
  }

  getAvailableCashRegisters(storeId: string): Observable<CashRegister[]> {
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/cash-registers/available`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des caisses disponibles');
        return of([]);
      })
    );
  }

  getCashRegistersWithOpenShifts(storeId: string): Observable<CashRegister[]> {
    return this.http.get<ApiResponse<CashRegister[]>>(
      this.apiConfig.getEndpoint(`/stores/${storeId}/cash-registers/with-open-shifts`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des caisses occupées');
        return of([]);
      })
    );
  }

  getStatistics(storeId?: string): Observable<CashRegisterStatistics> {
    const params:HttpParams = storeId ? new HttpParams().set('storeId', storeId) : new HttpParams();
    return this.http.get<ApiResponse<CashRegisterStatistics>>(
      this.apiConfig.getEndpoint('/cash-registers/statistics'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(stats => this.statistics.set(stats)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        return of({
          totalRegisters: 0,
          activeRegisters: 0,
          inactiveRegisters: 0,
          registersWithOpenShift: 0
        });
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadCashRegisters(newPage, this.pageSize());
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadCashRegisters(1, newPageSize);
  }

  initialize(storeId?: string) {
    if (storeId) {
      this.getCashRegistersByStore(storeId);
    } else {
      this.loadCashRegisters();
    }
    this.getStatistics(storeId).subscribe();
  }
}