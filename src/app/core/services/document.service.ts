// core/services/document.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../api/api.config';
import { AuthService } from './auth.service';
import { Order, OrderType, DocumentType } from '../models';

export interface DocumentRequest {
  orderId: string;
  documentType: DocumentType;
  format: 'pdf' | 'thermal' | 'text';
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfig);
  private authService = inject(AuthService);

  /**
   * Détermine le type de document approprié selon la commande
   */
  getDocumentTypeForOrder(order: Order): DocumentType {
    // Si c'est un proforma explicite
    if (order.orderType === OrderType.PROFORMA) {
      return DocumentType.PROFORMA;
    }
    
    // Si vente à crédit ou partiellement payée → Facture
    const hasCredit = order.payments?.some(p => p.status === 'CREDIT');
    const isPartiallyPaid = order.paymentStatus === 'PARTIALLY_PAID';
    const isCreditSale = order.orderType === OrderType.CREDIT_SALE;
    
    if (hasCredit || isPartiallyPaid || isCreditSale) {
      return DocumentType.INVOICE;
    }
    
    // Si payé en espèces/carte immédiatement → Ticket de caisse
    if (order.paymentStatus === 'PAID' && 
        (order.orderType === OrderType.POS_SALE || !order.orderType)) {
      return DocumentType.TICKET;
    }
    
    // Par défaut → Ticket
    return DocumentType.TICKET;
  }

  /**
   * Génère le document approprié
   */
  generateDocument(orderId: string, docType: DocumentType, format: 'pdf' | 'thermal' = 'pdf'): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const endpoint = this.getEndpointForType(docType, orderId, format);

    this.http.get(endpoint, { 
      headers,
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => {
        const filename = this.getFilename(orderId, docType, format);
        this.downloadBlob(blob, filename);
      },
      error: (err) => {
        console.error('Erreur génération document:', err);
      }
    });
  }

  /**
   * Ouvre le document dans un nouvel onglet
   */
  openDocument(orderId: string, docType: DocumentType): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const endpoint = this.getEndpointForType(docType, orderId, 'pdf');

    this.http.get(endpoint, { 
      headers,
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      },
      error: (err) => {
        console.error('Erreur ouverture document:', err);
      }
    });
  }

  private getEndpointForType(docType: DocumentType, orderId: string, format: string): string {
    switch (docType) {
      case DocumentType.TICKET:
      case DocumentType.RECEIPT:
        return format === 'thermal' 
          ? this.apiConfig.getEndpoint(`/receipts/order/${orderId}/thermal`)
          : this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`);
      
      case DocumentType.INVOICE:
        return this.apiConfig.getEndpoint(`/invoices/order/${orderId}/pdf`);
      
      case DocumentType.PROFORMA:
        return this.apiConfig.getEndpoint(`/proformas/order/${orderId}/pdf`);
      
      default:
        return this.apiConfig.getEndpoint(`/receipts/order/${orderId}/pdf`);
    }
  }

  private getFilename(orderId: string, docType: DocumentType, format: string): string {
    const prefix = docType.toLowerCase();
    const ext = format === 'thermal' ? 'bin' : 'pdf';
    return `${prefix}-${orderId}.${ext}`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Labels pour l'UI
   */
  getDocumentLabel(docType: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      [DocumentType.TICKET]: 'Ticket de caisse',
      [DocumentType.RECEIPT]: 'Reçu',
      [DocumentType.INVOICE]: 'Facture',
      [DocumentType.PROFORMA]: 'Proforma/Devis'
    };
    return labels[docType];
  }

  getDocumentIcon(docType: DocumentType): string {
    const icons: Record<DocumentType, string> = {
      [DocumentType.TICKET]: 'pi pi-ticket',
      [DocumentType.RECEIPT]: 'pi pi-receipt',
      [DocumentType.INVOICE]: 'pi pi-file-pdf',
      [DocumentType.PROFORMA]: 'pi pi-file-edit'
    };
    return icons[docType];
  }
}