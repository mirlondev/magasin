import { EmployeeRole, Order, OrderStatus } from "../models";
import { AuthService } from "./auth.service";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class PosPermissionService {
  constructor(private auth: AuthService) {}

  // ===== Helpers =====
  private isAdmin(): boolean {
    return this.auth.hasRole([EmployeeRole.ADMIN]);
  }

  private isStoreAdmin(): boolean {
    return this.auth.hasRole([EmployeeRole.STORE_ADMIN]);
  }

  private isCashier(): boolean {
    return this.auth.hasRole([EmployeeRole.CASHIER]);
  }

  // ===== View permissions =====
  canViewOrders(): boolean {
    return this.isAdmin() || this.isStoreAdmin() || this.isCashier();
  }

  // ===== Create / Update =====
  canCreateOrder(): boolean {
    return this.isAdmin() || this.isStoreAdmin() || this.isCashier();
  }

  canUpdateOrder(): boolean {
    return this.isAdmin() || this.isStoreAdmin() || this.isCashier();
  }

  // ===== Delete =====
  canDeleteOrder(): boolean {
    return this.isAdmin() || this.isStoreAdmin();
  }

  // ===== Export =====
  canExportOrders(): boolean {
    return this.isAdmin() || this.isStoreAdmin();
  }

  // ===== Payment =====
  canProcessPayment(): boolean {
    return this.isAdmin() || this.isStoreAdmin() || this.isCashier();
  }

  // ===== Order lifecycle =====
  canCompleteOrder(order: Order): boolean {
    if (!this.canProcessPayment()) return false;

    return order.status === OrderStatus.PENDING ||
           order.status === OrderStatus.PROCESSING;
  }

  canCancelOrder(order: Order): boolean {
    if (!this.isAdmin() && !this.isStoreAdmin()) return false;

    return order.status !== OrderStatus.CANCELLED &&
           order.status !== OrderStatus.COMPLETED;
  }

  canRefundOrder(order: Order): boolean {
    if (!this.isAdmin() && !this.isStoreAdmin()) return false;

    return order.status !== OrderStatus.REFUNDED &&
           order.status !== OrderStatus.COMPLETED;
  }
}
