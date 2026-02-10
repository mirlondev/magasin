import { PaymentStatus, PaymentMethod, Payment, Order, OrderStatus } from "../../models";

export class OrderHelper {
  /**
   * Calculate total paid from payments (excluding credits)
   */
  static getTotalPaid(payments: Payment[] | undefined | null): number {
    if (!payments) return 0;
    return payments
      .filter(p => p.status === PaymentStatus.PAID)
      .filter(p => p.method !== PaymentMethod.CREDIT)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Calculate total credit from payments
   */
  static getTotalCredit(payments: Payment[] | undefined | null): number {
    if (!payments) return 0;
    return payments
      .filter(p => p.method === PaymentMethod.CREDIT)
      .filter(p => p.status === PaymentStatus.CREDIT)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Calculate remaining amount to pay
   */
  static getRemainingAmount(order: Order): number {
    const totalPaid = this.getTotalPaid(order.payments);
    const totalCredit = this.getTotalCredit(order.payments);
    return Math.max(0, order.totalAmount - totalPaid - totalCredit);
  }

  /**
   * Determine computed payment status
   */
  static getComputedPaymentStatus(order: Order): PaymentStatus {
    const totalPaid = this.getTotalPaid(order.payments);
    const totalCredit = this.getTotalCredit(order.payments);
    const totalPaidAndCredit = totalPaid + totalCredit;

    if (totalPaidAndCredit === 0) {
      return PaymentStatus.UNPAID;
    }

    if (totalPaidAndCredit >= order.totalAmount) {
      // If everything is credit, return CREDIT status
      if (totalPaid === 0) {
        return PaymentStatus.CREDIT;
      }
      return PaymentStatus.PAID;
    }

    return PaymentStatus.PARTIALLY_PAID;
  }

  /**
   * Check if order is fully paid
   */
  static isFullyPaid(order: Order): boolean {
    const status = this.getComputedPaymentStatus(order);
    return status === PaymentStatus.PAID || status === PaymentStatus.CREDIT;
  }

  /**
   * Get payment method label
   */
  static getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CREDIT_CARD]: 'Carte Bancaire',
      [PaymentMethod.DEBIT_CARD]: 'Carte de Débit',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Virement Bancaire',
      [PaymentMethod.CHECK]: 'Chèque',
      [PaymentMethod.LOYALTY_POINTS]: 'Points de Fidélité',
      [PaymentMethod.CREDIT]: 'Crédit',
      [PaymentMethod.MIXED]: 'Mixte'
    };
    return labels[method] || method;
  }

  /**
   * Get payment status label
   */
  static getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      [PaymentStatus.UNPAID]: 'Non payé',
      [PaymentStatus.PARTIALLY_PAID]: 'Partiellement payé',
      [PaymentStatus.PAID]: 'Payé',
      [PaymentStatus.CREDIT]: 'À crédit',
      [PaymentStatus.CANCELLED]: 'Annulé',
      [PaymentStatus.REFUNDED]: 'Remboursé',
      [PaymentStatus.FAILED]: 'Échoué'
    };
    return labels[status] || status;
  }

  /**
   * Get payment status severity for UI
   */
  static getPaymentStatusSeverity(status: PaymentStatus): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const severities: Record<PaymentStatus, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      [PaymentStatus.UNPAID]: 'danger',
      [PaymentStatus.PARTIALLY_PAID]: 'warn',
      [PaymentStatus.PAID]: 'success',
      [PaymentStatus.CREDIT]: 'info',
      [PaymentStatus.CANCELLED]: 'danger',
      [PaymentStatus.REFUNDED]: 'secondary',
      [PaymentStatus.FAILED]: 'danger'
    };
    return severities[status] || 'info';
  }

  /**
   * Get order status label
   */
  static getOrderStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'En attente',
      [OrderStatus.PROCESSING]: 'En traitement',
      [OrderStatus.READY]: 'Prête',
      [OrderStatus.COMPLETED]: 'Terminée',
      [OrderStatus.CANCELLED]: 'Annulée',
      [OrderStatus.REFUNDED]: 'Remboursée'
    };
    return labels[status] || status;
  }

  /**
   * Get order status severity for UI
   */
  static getOrderStatusSeverity(status: OrderStatus): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    const severities: Record<OrderStatus, 'success' | 'warn' | 'info' | 'danger' | 'secondary'> = {
      [OrderStatus.PENDING]: 'warn',
      [OrderStatus.PROCESSING]: 'info',
      [OrderStatus.READY]: 'info',
      [OrderStatus.COMPLETED]: 'success',
      [OrderStatus.CANCELLED]: 'danger',
      [OrderStatus.REFUNDED]: 'secondary'
    };
    return severities[status] || 'info';
  }
}