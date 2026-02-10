import { PaymentStatus } from '../models';
import { StatusUiMap } from '../utils/status-ui.utils';

export const PAYMENT_STATUS_UI: StatusUiMap<PaymentStatus> = {
  [PaymentStatus.UNPAID]: {
    label: 'En attente',
    severity: 'warn'
  },
  [PaymentStatus.PAID]: {
    label: 'Payée',
    severity: 'success'
  },
  [PaymentStatus.PARTIALLY_PAID]: {
    label: 'Partiellement payée',
    severity: 'info'
  },
  [PaymentStatus.FAILED]: {
    label: 'Échouée',
    severity: 'danger'
  },
  [PaymentStatus.REFUNDED]: {
    label: 'Remboursée',
    severity: 'secondary'
  },
  [PaymentStatus.CANCELLED]: {
    label: 'Annulée',
    severity: 'danger'
  },
  [PaymentStatus.CREDIT]: {
    label: 'Crédit',
    severity: 'info'
  }
  
};
