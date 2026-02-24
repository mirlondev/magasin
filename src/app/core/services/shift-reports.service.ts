// src/app/core/services/shift-reports.service.ts

import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, tap, of } from "rxjs";
import { ApiConfig } from "../api/api.config";
import { HttpErrorHandler } from "../api/http-error.handler";
import {
  ApiResponse,
  PaginatedResponse,
  ShiftReport,
  ShiftStatus,
  ShiftReportRequest,
  CloseShiftRequest,
  ShiftReportDetailResponse,
  ShiftStatistics,
  ReceiptData
} from "../models";

interface ShiftReportFilters {
  status?: ShiftStatus;
  storeId?: string;
  cashierId?: string;
  cashRegisterId?: string;
  startDate?: string;
  endDate?: string;
  cashierName?: string;
  storeName?: string;
  cashRegisterNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class ShiftReportsService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);

  // State Signals
  shiftReports = signal<ShiftReport[]>([]);
  selectedShiftReport = signal<ShiftReport | null>(null);
  selectedShiftDetail = signal<ShiftReportDetailResponse | null>(null);
  currentShift = signal<ShiftReport | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);

  // Statistics
  statistics = signal<ShiftStatistics | null>(null);
  openShifts = signal<ShiftReport[]>([]);
  closedShifts = signal<ShiftReport[]>([]);
  suspendedShifts = signal<ShiftReport[]>([]);
  totalSales = signal<number>(0);
  totalRefunds = signal<number>(0);

  loadShiftReports(
    page: number = 1,
    pageSize: number = 10,
    filters?: ShiftReportFilters
  ): Observable<PaginatedResponse<ShiftReport>> {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      page: page - 1,
      size: pageSize,
      ...filters
    };

    return this.http.get<ApiResponse<PaginatedResponse<ShiftReport>>>(
      this.apiConfig.getEndpoint('/shift-reports'),
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const items = data?.items || [];
        this.shiftReports.set(items);
        this.total.set(data?.total || 0);
        this.page.set(data?.page + 1);
        this.pageSize.set(data?.size || 10);

        // Update statistics
        this.openShifts.set(items.filter(s => s.status === ShiftStatus.OPEN));
        this.closedShifts.set(items.filter(s => s.status === ShiftStatus.CLOSED));
        this.suspendedShifts.set(items.filter(s => s.status === ShiftStatus.SUSPENDED));
        this.totalSales.set(items.reduce((sum, shift) => sum + (shift.totalSales || 0), 0));
        this.totalRefunds.set(items.reduce((sum, shift) => sum + (shift.totalRefunds || 0), 0));

        this.loading.set(false);
      }),
      catchError(error => {
        const errorMsg = this.errorHandler.handleError(error, 'Chargement des sessions de caisse');
        this.error.set(errorMsg);
        this.loading.set(false);
        return of({ items: [], total: 0, page: 0, size: 0, totalPages: 0 });
      })
    );
  }

  getShiftReportById(shiftId: string): Observable<ShiftReport> {
    this.loading.set(true);
    return this.http.get<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}`)
    ).pipe(
      map(response => response.data),
      tap(shift => {
        this.selectedShiftReport.set(shift);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement de la session de caisse');
        throw error;
      })
    );
  }

  getShiftDetail(shiftId: string): Observable<ShiftReportDetailResponse> {
    this.loading.set(true);
    return this.http.get<ApiResponse<ShiftReportDetailResponse>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/details`)
    ).pipe(
      map(response => response.data),
      tap(detail => {
        this.selectedShiftDetail.set(detail);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Chargement des détails de la session');
        throw error;
      })
    );
  }

  openShift(shiftData: ShiftReportRequest): Observable<ShiftReport> {
    this.loading.set(true);
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint('/shift-reports/open'),
      shiftData
    ).pipe(
      map(response => response.data),
      tap(newShift => {
        this.shiftReports.update(shifts => [newShift, ...shifts]);
        this.total.update(total => total + 1);
        this.currentShift.set(newShift);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Ouverture de la caisse');
        throw error;
      })
    );
  }

  closeShift(shiftId: string, closingData: CloseShiftRequest): Observable<ShiftReport> {
    this.loading.set(true);
    const params: any = {};
    if (closingData.actualBalance !== undefined) {
      params.actualBalance = closingData.actualBalance.toString();
    }
    if (closingData.notes) {
      params.notes = closingData.notes;
    }

    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/close`),
      null,
      { params }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts =>
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
        this.currentShift.set(null);
        this.loading.set(false);
      }),
      catchError(error => {
        this.loading.set(false);
        this.errorHandler.handleError(error, 'Fermeture de la caisse');
        throw error;
      })
    );
  }

  suspendShift(shiftId: string, reason?: string): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/suspend`),
      null,
      { params: { reason: reason || '' } }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts =>
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
        if (this.currentShift()?.shiftReportId === shiftId) {
          this.currentShift.set(updatedShift);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Suspension de la caisse');
        throw error;
      })
    );
  }

  resumeShift(shiftId: string): Observable<ShiftReport> {
    return this.http.patch<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/resume`),
      {}
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts =>
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
        if (this.currentShift()?.shiftReportId === shiftId) {
          this.currentShift.set(updatedShift);
        }
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Reprise de la caisse');
        throw error;
      })
    );
  }

  getCurrentShift(): Observable<ShiftReport | null> {
    return this.http.get<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint('/shift-reports/cashier/open')
    ).pipe(
      map(response => response.data),
      tap(shift => this.currentShift.set(shift)),
      catchError(() => {
        this.currentShift.set(null);
        return of(null);
      })
    );
  }

  addCashToShift(shiftId: string, amount: number, reason: string): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/cash-in`),
      { amount, reason }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts =>
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Ajout de fonds');
        throw error;
      })
    );
  }

  removeCashFromShift(shiftId: string, amount: number, reason: string): Observable<ShiftReport> {
    return this.http.post<ApiResponse<ShiftReport>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/cash-out`),
      { amount, reason }
    ).pipe(
      map(response => response.data),
      tap(updatedShift => {
        this.shiftReports.update(shifts =>
          shifts.map(shift => shift.shiftReportId === shiftId ? updatedShift : shift)
        );
        this.selectedShiftReport.set(updatedShift);
      }),
      catchError(error => {
        this.errorHandler.handleError(error, 'Retrait de fonds');
        throw error;
      })
    );
  }

  getShiftReceipts(shiftId: string): Observable<ReceiptData[]> {
    return this.http.get<ApiResponse<ReceiptData[]>>(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/receipts`)
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des reçus');
        return of([]);
      })
    );
  }

  exportShiftReport(shiftId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf'): Observable<Blob> {
    return this.http.get(
      this.apiConfig.getEndpoint(`/shift-reports/${shiftId}/export`),
      {
        params: { format },
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Export du rapport');
        throw error;
      })
    );
  }

  getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month'): Observable<ShiftStatistics> {
    return this.http.get<ApiResponse<ShiftStatistics>>(
      this.apiConfig.getEndpoint('/shift-reports/statistics'),
      { params: { period } }
    ).pipe(
      map(response => response.data),
      tap(stats => this.statistics.set(stats)),
      catchError(error => {
        this.errorHandler.handleError(error, 'Chargement des statistiques');
        return of({
          totalShifts: 0,
          openShifts: 0,
          closedShifts: 0,
          suspendedShifts: 0,
          totalSales: 0,
          totalRefunds: 0,
          averageShiftDuration: 0,
          totalDiscrepancy: 0
        });
      })
    );
  }

  setPage(newPage: number) {
    this.page.set(newPage);
    this.loadShiftReports(newPage, this.pageSize()).subscribe();
  }

  setPageSize(newPageSize: number) {
    this.pageSize.set(newPageSize);
    this.loadShiftReports(1, newPageSize).subscribe();
  }

  initialize() {
    this.loadShiftReports().subscribe();
    this.getCurrentShift().subscribe();
    this.getStatistics().subscribe();
  }
}