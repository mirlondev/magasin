import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiConfig } from '../api/api.config';
import { ApiResponse, ReceiptData } from '../models';
import { AuthService } from './auth.service';

export type { ReceiptData };

export type PrintTarget = 'thermal' | 'pdf' | 'later';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private authService = inject(AuthService);

  getReceipt(receiptId: string): Observable<ReceiptData> {
    return this.http.get<ApiResponse<ReceiptData>>(
      this.apiConfig.getEndpoint(`/receipts/${receiptId}`)
    ).pipe(map(r => r.data));
  }

  openPdf(receiptId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/${receiptId}/pdf`),
      {
        headers,
        responseType: 'blob'
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');

        if (newWindow) {
          newWindow.onload = () => {
            // PDF loaded
          };
        }

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      },
      error: (err) => {
        console.error('Erreur chargement PDF:', err);
        if (err.status === 401 || err.status === 403) {
          alert('Session expirée. Veuillez vous reconnecter.');
        }
      }
    });
  }

  downloadPdf(receiptId: string, filename?: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/${receiptId}/pdf`),
      {
        headers,
        responseType: 'blob'
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `ticket-${receiptId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur téléchargement PDF:', err);
      }
    });
  }

  downloadThermal(receiptId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/${receiptId}/thermal`),
      {
        headers,
        responseType: 'blob'
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-thermal-${receiptId}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur téléchargement thermique:', err);
      }
    });
  }

  printPdf(receiptId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/${receiptId}/pdf`),
      {
        headers,
        responseType: 'blob'
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              window.URL.revokeObjectURL(url);
            }, 1000);
          }, 500);
        };

        document.body.appendChild(iframe);
      },
      error: (err) => {
        console.error('Erreur impression:', err);
      }
    });
  }
}