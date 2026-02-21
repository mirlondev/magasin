// core/services/invoice.service.ts
// Covers ALL /invoices/* endpoints from InvoiceController.java

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiConfig } from '../api/api.config';
import { HttpErrorHandler } from '../api/http-error.handler';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models';

// ── Response shape matching InvoiceResponse.java record ───────────────────
export interface InvoiceResponse {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: 'CREDIT_SALE' | 'PROFORMA';
  status: InvoiceStatus;
  orderId: string;
  customerId?: string;
  customerName?: string;
  storeId?: string;
  invoiceDate: string;
  paymentDueDate?: string;
  validityDays?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string;
  notes?: string;
  printCount: number;
  pdfFilename?: string;
  pdfPath?: string;
  convertedToSale: boolean;
  isActive: boolean;
}

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'CONVERTED';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private authService = inject(AuthService);

  // ── State ─────────────────────────────────────────────────────────────────
  invoices = signal<InvoiceResponse[]>([]);
  selectedInvoice = signal<InvoiceResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // ==========================================================================
  // GENERATION
  // POST /invoices/order/{orderId}
  // ==========================================================================

  /**
   * Generates an invoice for a CREDIT_SALE or PROFORMA order.
   * Uses InvoiceDocumentStrategy / ProformaDocumentStrategy via DocumentStrategyFactory.
   * Returns invoice metadata — PDF is fetched separately via downloadPdf().
   */
  generateInvoice(orderId: string): Observable<InvoiceResponse> {
    this.loading.set(true);
    return this.http
      .post<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/order/${orderId}`),
        null
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => {
          this.selectedInvoice.set(invoice);
          this.loading.set(false);
        }),
        catchError((err) => {
          this.loading.set(false);
          this.errorHandler.handleError(err, 'Génération de la facture');
          throw err;
        })
      );
  }

  // ==========================================================================
  // READ
  // GET /invoices/{invoiceId}
  // GET /invoices/number/{invoiceNumber}
  // GET /invoices/order/{orderId}
  // GET /invoices/customer/{customerId}
  // GET /invoices/store/{storeId}
  // GET /invoices/status/{status}
  // GET /invoices/date-range
  // GET /invoices/overdue
  // GET /invoices/outstanding-amount
  // ==========================================================================

  /** GET /invoices/{invoiceId} */
  getById(invoiceId: string): Observable<InvoiceResponse> {
    return this.http
      .get<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}`)
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.selectedInvoice.set(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Récupération de la facture');
          throw err;
        })
      );
  }

  /** GET /invoices/number/{invoiceNumber} */
  getByNumber(invoiceNumber: string): Observable<InvoiceResponse> {
    return this.http
      .get<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/number/${invoiceNumber}`)
      )
      .pipe(
        map((r) => r.data),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Récupération de la facture');
          throw err;
        })
      );
  }

  /** GET /invoices/order/{orderId} */
  getByOrder(orderId: string): Observable<InvoiceResponse> {
    return this.http
      .get<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/order/${orderId}`)
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.selectedInvoice.set(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Récupération de la facture');
          throw err;
        })
      );
  }

  /** GET /invoices/customer/{customerId} */
  getByCustomer(customerId: string): Observable<InvoiceResponse[]> {
    return this.http
      .get<ApiResponse<InvoiceResponse[]>>(
        this.apiConfig.getEndpoint(`/invoices/customer/${customerId}`)
      )
      .pipe(
        map((r) => r.data),
        tap((list) => this.invoices.set(list)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Factures du client');
          throw err;
        })
      );
  }

  /** GET /invoices/store/{storeId} */
  getByStore(storeId: string): Observable<InvoiceResponse[]> {
    return this.http
      .get<ApiResponse<InvoiceResponse[]>>(
        this.apiConfig.getEndpoint(`/invoices/store/${storeId}`)
      )
      .pipe(
        map((r) => r.data),
        tap((list) => this.invoices.set(list)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Factures du magasin');
          throw err;
        })
      );
  }

  /** GET /invoices/status/{status} */
  getByStatus(status: InvoiceStatus): Observable<InvoiceResponse[]> {
    return this.http
      .get<ApiResponse<InvoiceResponse[]>>(
        this.apiConfig.getEndpoint(`/invoices/status/${status}`)
      )
      .pipe(
        map((r) => r.data),
        tap((list) => this.invoices.set(list)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Factures par statut');
          throw err;
        })
      );
  }

  /**
   * GET /invoices/date-range?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
   * Dates must be ISO format: '2026-01-01'
   */
  getByDateRange(startDate: string, endDate: string): Observable<InvoiceResponse[]> {
    return this.http
      .get<ApiResponse<InvoiceResponse[]>>(
        this.apiConfig.getEndpoint('/invoices/date-range'),
        { params: { startDate, endDate } }
      )
      .pipe(
        map((r) => r.data),
        tap((list) => this.invoices.set(list)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Factures par période');
          throw err;
        })
      );
  }

  /** GET /invoices/overdue */
  getOverdue(): Observable<InvoiceResponse[]> {
    return this.http
      .get<ApiResponse<InvoiceResponse[]>>(
        this.apiConfig.getEndpoint('/invoices/overdue')
      )
      .pipe(
        map((r) => r.data),
        tap((list) => this.invoices.set(list)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Factures en retard');
          throw err;
        })
      );
  }

  /** GET /invoices/outstanding-amount → returns Double (not wrapped in ApiResponse) */
  getOutstandingAmount(): Observable<number> {
    return this.http
      .get<number>(this.apiConfig.getEndpoint('/invoices/outstanding-amount'))
      .pipe(
        catchError((err) => {
          this.errorHandler.handleError(err, 'Montant des créances');
          throw err;
        })
      );
  }

  // ==========================================================================
  // PDF
  // GET  /invoices/{invoiceId}/pdf              → download by invoiceId
  // GET  /invoices/order/{orderId}/pdf          → download by orderId (cached)
  // POST /invoices/order/{orderId}/pdf/regenerate
  // ==========================================================================

  /**
   * GET /invoices/{invoiceId}/pdf
   * Downloads the PDF for a known invoiceId.
   * Opens inline in browser (Content-Disposition: inline from backend).
   */
  downloadPdfById(invoiceId: string): Observable<Blob> {
    return this.http
      .get(this.apiConfig.getEndpoint(`/invoices/${invoiceId}/pdf`), {
        responseType: 'blob',
      })
      .pipe(
        catchError((err) => {
          this.errorHandler.handleError(err, 'Téléchargement de la facture');
          throw err;
        })
      );
  }

  /**
   * GET /invoices/order/{orderId}/pdf
   * File-cached endpoint — checks disk first, generates only if needed.
   * Preferred for order-level document access.
   */
  downloadPdfByOrder(orderId: string): Observable<Blob> {
    return this.http
      .get(this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf`), {
        responseType: 'blob',
      })
      .pipe(
        catchError((err) => {
          this.errorHandler.handleError(err, 'Téléchargement de la facture');
          throw err;
        })
      );
  }

  /**
   * POST /invoices/order/{orderId}/pdf/regenerate
   * Forces PDF regeneration even if file already exists on disk.
   */
  regeneratePdf(orderId: string): Observable<Blob> {
    return this.http
      .post(
        this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf/regenerate`),
        null,
        { responseType: 'blob' }
      )
      .pipe(
        catchError((err) => {
          this.errorHandler.handleError(err, 'Régénération de la facture PDF');
          throw err;
        })
      );
  }

  // ==========================================================================
  // LIFECYCLE MUTATIONS
  // PUT  /invoices/{invoiceId}/status
  // PUT  /invoices/{invoiceId}/mark-paid
  // PUT  /invoices/{invoiceId}/cancel
  // POST /invoices/{proformaId}/convert-to-sale
  // POST /invoices/{invoiceId}/reprint
  // POST /invoices/{invoiceId}/send-email
  // ==========================================================================

  /**
   * PUT /invoices/{invoiceId}/status?status=PAID
   * Valid values: DRAFT | ISSUED | PAID | PARTIALLY_PAID | OVERDUE | CANCELLED
   */
  updateStatus(invoiceId: string, status: InvoiceStatus): Observable<InvoiceResponse> {
    return this.http
      .put<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}/status`),
        null,
        { params: { status } }
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.updateLocalInvoice(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Mise à jour du statut');
          throw err;
        })
      );
  }

  /**
   * PUT /invoices/{invoiceId}/mark-paid?paymentMethod=CASH
   * Valid paymentMethod values match PaymentMethod enum on backend.
   */
  markAsPaid(invoiceId: string, paymentMethod: string): Observable<InvoiceResponse> {
    return this.http
      .put<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}/mark-paid`),
        null,
        { params: { paymentMethod } }
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.updateLocalInvoice(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Marquage comme payée');
          throw err;
        })
      );
  }

  /**
   * PUT /invoices/{invoiceId}/cancel
   * Not allowed if invoice is already PAID (use credit note instead).
   */
  cancel(invoiceId: string): Observable<InvoiceResponse> {
    return this.http
      .put<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}/cancel`),
        null
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.updateLocalInvoice(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Annulation de la facture');
          throw err;
        })
      );
  }

  /**
   * POST /invoices/{proformaId}/convert-to-sale
   * Converts a PROFORMA invoice into a real CREDIT_SALE invoice.
   */
  convertProformaToSale(proformaId: string): Observable<InvoiceResponse> {
    return this.http
      .post<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${proformaId}/convert-to-sale`),
        null
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.updateLocalInvoice(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Conversion proforma en vente');
          throw err;
        })
      );
  }

  /**
   * POST /invoices/{invoiceId}/reprint
   * Increments print counter, returns updated invoice metadata.
   */
  reprint(invoiceId: string): Observable<InvoiceResponse> {
    return this.http
      .post<ApiResponse<InvoiceResponse>>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}/reprint`),
        null
      )
      .pipe(
        map((r) => r.data),
        tap((invoice) => this.updateLocalInvoice(invoice)),
        catchError((err) => {
          this.errorHandler.handleError(err, 'Réimpression de la facture');
          throw err;
        })
      );
  }

  /**
   * POST /invoices/{invoiceId}/send-email?email=recipient@example.com
   * Backend generates PDF and sends it; returns 200 on success, 500 on error.
   */
  sendByEmail(invoiceId: string, email: string): Observable<void> {
    return this.http
      .post<void>(
        this.apiConfig.getEndpoint(`/invoices/${invoiceId}/send-email`),
        null,
        { params: { email } }
      )
      .pipe(
        catchError((err) => {
          this.errorHandler.handleError(err, 'Envoi de la facture par email');
          throw err;
        })
      );
  }

  // ==========================================================================
  // UI HELPERS
  // ==========================================================================

  /** Opens PDF in a new browser tab (authenticated). */
  openPdfInTab(invoiceId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http
      .get(this.apiConfig.getEndpoint(`/invoices/${invoiceId}/pdf`), {
        headers,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const win = window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        },
        error: (err) =>
          this.errorHandler.handleError(err, 'Ouverture de la facture'),
      });
  }

  /** Downloads PDF to disk. Uses orderId-based cached endpoint. */
  savePdfToDisk(orderId: string, filename?: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http
      .get(this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf`), {
        headers,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename ?? `facture-${orderId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) =>
          this.errorHandler.handleError(err, 'Téléchargement de la facture'),
      });
  }

  getStatusLabel(status: InvoiceStatus): string {
    const labels: Record<InvoiceStatus, string> = {
      DRAFT: 'Brouillon',
      ISSUED: 'Émise',
      PAID: 'Payée',
      PARTIALLY_PAID: 'Partiellement payée',
      OVERDUE: 'En retard',
      CANCELLED: 'Annulée',
      CONVERTED: 'Convertie',
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(
    status: InvoiceStatus
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<InvoiceStatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      DRAFT: 'secondary',
      ISSUED: 'info',
      PAID: 'success',
      PARTIALLY_PAID: 'warn',
      OVERDUE: 'danger',
      CANCELLED: 'danger',
      CONVERTED: 'success',
    };
    return map[status] ?? 'secondary';
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private updateLocalInvoice(updated: InvoiceResponse) {
    this.invoices.update((list) =>
      list.map((inv) => (inv.invoiceId === updated.invoiceId ? updated : inv))
    );
    if (this.selectedInvoice()?.invoiceId === updated.invoiceId) {
      this.selectedInvoice.set(updated);
    }
  }
}