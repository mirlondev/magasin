import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiConfig } from '../api/api.config';
import { HttpErrorHandler } from '../api/http-error.handler';
import { AuthService } from './auth.service';
import { ApiResponse, InvoiceResponse, InvoiceStatus, InvoiceType } from '../models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private errorHandler = inject(HttpErrorHandler);
  private authService = inject(AuthService);

  invoices = signal<InvoiceResponse[]>([]);
  selectedInvoice = signal<InvoiceResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

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

  private updateLocalInvoice(updated: InvoiceResponse) {
    this.invoices.update((list) =>
      list.map((inv) => (inv.invoiceId === updated.invoiceId ? updated : inv))
    );
    if (this.selectedInvoice()?.invoiceId === updated.invoiceId) {
      this.selectedInvoice.set(updated);
    }
  }
}