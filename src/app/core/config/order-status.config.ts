import { OrderStatus } from '../models';
import { StatusUiMap } from '../utils/status-ui.utils';

export const ORDER_STATUS_UI: StatusUiMap<OrderStatus> = {
  [OrderStatus.PENDING]: {
    label: 'En attente',
    severity: 'warn'
  },
  [OrderStatus.PROCESSING]: {
    label: 'En traitement',
    severity: 'info'
  },
  [OrderStatus.READY]: {
    label: 'Prête',
    severity: 'info'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Terminée',
    severity: 'success'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Annulée',
    severity: 'danger'
  },
  [OrderStatus.REFUNDED]: {
    label: 'Remboursée',
    severity: 'secondary'
  }
};
