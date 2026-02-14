// core/services/receipt.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiConfig } from '../api/api.config';
import { ApiResponse } from '../models';
import { AuthService } from './auth.service';

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  cashierName: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  items: Array<{
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
    finalPrice: number;
    discountAmount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  changeAmount: number;
  paymentsByMethod: Record<string, number>;
  creditAmount: number;
  notes?: string;
  createdAt: string;
}

export type PrintTarget = 'thermal' | 'pdf' | 'later';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private authService = inject(AuthService);

  /**
   * Get receipt data (JSON) - pour l'aperçu
   */
  getReceipt(orderId: string): Observable<ReceiptData> {
    return this.http.get<ApiResponse<ReceiptData>>(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}`)
    ).pipe(map(r => r.data));
  }

  /**
   * Ouvre le PDF dans un nouvel onglet avec authentification
   * Solution: Télécharger le blob puis créer une URL objet
   */
  openPdf(orderId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`),
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        // Créer URL blob et ouvrir dans nouvel onglet
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        // Nettoyer l'URL après ouverture
        if (newWindow) {
          newWindow.onload = () => {
            // Le PDF est chargé, on peut optionnellement print
            // newWindow.print();
          };
        }
        
        // Revoke après un délai pour permettre le chargement
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000); // 1 minute de grace
      },
      error: (err) => {
        console.error('Erreur chargement PDF:', err);
        if (err.status === 401 || err.status === 403) {
          alert('Session expirée. Veuillez vous reconnecter.');
        }
      }
    });
  }

  /**
   * Télécharge le PDF (save as)
   */
  downloadPdf(orderId: string, filename?: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`),
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `ticket-${orderId}.pdf`;
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

  /**
   * Télécharge les données thermiques (.bin)
   */
  downloadThermal(orderId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/thermal`),
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-thermal-${orderId}.bin`;
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

  /**
   * Imprime directement via le navigateur (ouvre PDF puis print dialog)
   */
  printPdf(orderId: string): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(
      this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`),
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        
        // Créer une iframe cachée pour imprimer
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            // Nettoyer après impression
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