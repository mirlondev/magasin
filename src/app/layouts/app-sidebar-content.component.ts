import { CommonModule } from "@angular/common";
import { Component, Input, computed, inject } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MenuItem } from "primeng/api";
import { AvatarModule } from "primeng/avatar";
import { BadgeModule } from "primeng/badge";
import { RippleModule } from "primeng/ripple";
import { TooltipModule } from "primeng/tooltip";
import { EmployeeRole } from "../core/models";
import { AuthService } from "../core/services/auth.service";

@Component({
  selector: 'app-sidebar-content',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    BadgeModule,
    RippleModule,
    TooltipModule
  ],
  template: `
    <div class="sidebar-menu flex-1 overflow-auto">
      <nav class="p-3">
        @for (item of filteredMenuItems(); track item.label) {
          @if (item.items && item.items.length > 0) {
            <div class="menu-group">
              <div class="menu-group-header" (click)="toggleGroup(item)">
                <i class="pi {{ item.icon }}"></i>
                @if (!collapsed) {
                  <span class="menu-label">{{ item.label }}</span>
                }
                @if (item.badge && !collapsed) {
                  <p-badge [value]="item.badge" severity="danger" />
                }
                @if (!collapsed) {
                  <i class="pi pi-chevron-down group-arrow" 
                     [class.rotated]="item.expanded"></i>
                }
              </div>
              
              @if (item.expanded || collapsed) {
                <div class="menu-group-items" [class.collapsed]="collapsed">
                  @for (subItem of item.items; track subItem.label) {
                    @if (hasPermission(subItem['roles'])) {
                      <a [routerLink]="subItem.routerLink" 
                         [routerLinkActive]="'active'"
                         class="menu-item"
                         pRipple
                         [pTooltip]="collapsed ? subItem.label : ''"
                         tooltipPosition="right">
                        <i class="pi {{ subItem.icon }}"></i>
                        @if (!collapsed) {
                          <span class="menu-label">{{ subItem.label }}</span>
                        }
                        @if (subItem.badge && !collapsed) {
                          <p-badge [value]="subItem.badge" severity="danger" />
                        }
                      </a>
                    }
                  }
                </div>
              }
            </div>
          } @else {
            @if (hasPermission(item['roles'])) {
              <a [routerLink]="item.routerLink" 
                 [routerLinkActive]="'active'"
                 class="menu-item"
                 pRipple
                 [pTooltip]="collapsed ? item.label : ''"
                 tooltipPosition="right">
                <i class="pi {{ item.icon }}"></i>
                @if (!collapsed) {
                  <span class="menu-label">{{ item.label }}</span>
                }
                @if (item.badge && !collapsed) {
                  <p-badge [value]="item.badge" severity="danger" />
                }
              </a>
            }
          }
        }
      </nav>
    </div>
    
    <!-- User Profile -->
    <div class="sidebar-footer p-3 border-t-1 border-surface-border">
      <div class="user-profile flex align-items-center gap-3">
        <p-avatar [label]="userInitials()" 
                 shape="circle" 
                 size="large"
                 [style]="{
                   'background-color': 'var(--primary-color)',
                   'color': 'var(--primary-color-text)'
                 }" />
        
        @if (!collapsed) {
          <div class="user-info flex-1 overflow-hidden">
            <div class="font-semibold text-sm truncate">{{ userName() }}</div>
            <div class="text-xs text-surface-500 truncate">{{ userRoleLabel() }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sidebar-menu {
      scrollbar-width: thin;
      scrollbar-color: var(--surface-border) transparent;
    }
    
    .sidebar-menu::-webkit-scrollbar {
      width: 6px;
    }
    
    .sidebar-menu::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .sidebar-menu::-webkit-scrollbar-thumb {
      background-color: var(--surface-border);
      border-radius: 3px;
    }
    
    .menu-group {
      margin-bottom: 0.5rem;
    }
    
    .menu-group-header {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-radius: var(--border-radius);
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;
      gap: 0.75rem;
      color: var(--text-color-secondary);
    }
    
    .menu-group-header:hover {
      background: var(--surface-hover);
    }
    
    .menu-group-header i:first-child {
      font-size: 1.25rem;
      min-width: 1.5rem;
    }
    
    .menu-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .group-arrow {
      transition: transform 0.2s;
      margin-left: auto;
      font-size: 0.875rem;
    }
    
    .group-arrow.rotated {
      transform: rotate(180deg);
    }
    
    .menu-group-items {
      margin-left: 1.5rem;
      border-left: 1px solid var(--surface-border);
      padding-left: 0.75rem;
      margin-top: 0.25rem;
      margin-bottom: 0.5rem;
    }
    
    .menu-group-items.collapsed {
      margin-left: 0;
      border-left: none;
      padding-left: 0;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-radius: var(--border-radius);
      text-decoration: none;
      color: var(--text-color-secondary);
      transition: background-color 0.2s;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
      position: relative;
    }
    
    .menu-item:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }
    
    .menu-item.active {
      background: var(--primary-color);
      color: var(--primary-color-text);
    }
    
    .menu-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--primary-color);
      border-radius: 0 3px 3px 0;
    }
    
    .menu-item i {
      font-size: 1.25rem;
      min-width: 1.5rem;
    }
    
    .sidebar-footer {
      background: var(--surface-ground);
    }
    
    .user-profile {
      transition: padding 0.3s ease;
    }
    
    .user-info {
      transition: opacity 0.3s ease;
    }
  `]
})
export class SidebarContentComponent {
  @Input() collapsed = false;
  
  private authStore = inject(AuthService);
  
  user = this.authStore.currentUser();
  userRole = this.authStore.currentUser()?.userRole;
  
  userName = computed(() => this.user?.username || 'Utilisateur');
  userInitials = computed(() => {
    const name = this.userName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  });
  
  userRoleLabel = computed(() => {
    const role = this.userRole;
    switch (role) {
      case EmployeeRole.ADMIN: return 'Administrateur';
      case EmployeeRole.STORE_ADMIN: return 'Admin Magasin';
      case EmployeeRole.CASHIER: return 'Caissier';
      case EmployeeRole.DEPOT_MANAGER: return 'Gérant Dépot';
      case EmployeeRole.EMPLOYEE: return 'Employé';
      default: return 'Non connecté';
    }
  });

  // Menu items avec contrôle d'accès par rôle
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi-chart-line',
      routerLink: '/dashboard',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER, EmployeeRole.DEPOT_MANAGER, EmployeeRole.EMPLOYEE]
    },
    {
      label: 'Ventes',
      icon: 'pi-shopping-cart',
      routerLink: '/orders',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER],
      items: [
        {
          label: 'Commandes',
          icon: 'pi-list',
          routerLink: '/orders',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]
        },
        {
          label: 'Remboursements',
          icon: 'pi-undo',
          routerLink: '/refunds',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]
        },
        {
          label: 'Rapports de caisse',
          icon: 'pi-file',
          routerLink: '/shift-reports',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]
        }
      ]
    },
    {
      label: 'Catalogue',
      icon: 'pi-box',
      routerLink: '/products',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER],
      items: [
        {
          label: 'Produits',
          icon: 'pi-tag',
          routerLink: '/products',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER, EmployeeRole.EMPLOYEE]
        },
        {
          label: 'Catégories',
          icon: 'pi-folder',
          routerLink: '/categories',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]
        },
        {
          label: 'Inventaire',
          icon: 'pi-warehouse',
          routerLink: '/inventory',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]
        }
      ]
    },
    {
      label: 'Clients',
      icon: 'pi-users',
      routerLink: '/customers',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]
    },
    {
      label: 'Magasins',
      icon: 'pi-warehouse',
      routerLink: '/stores',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]
    },
    {
      label: 'Employés',
      icon: 'pi-id-card',
      routerLink: '/employees',
      roles: [EmployeeRole.ADMIN]
    },
    {
      label: 'Paramètres',
      icon: 'pi-cog',
      routerLink: '/settings',
      roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN],
      items: [
        {
          label: 'Profil',
          icon: 'pi-user',
          routerLink: '/settings/profile',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER, EmployeeRole.DEPOT_MANAGER, EmployeeRole.EMPLOYEE]
        },
        {
          label: 'Sécurité',
          icon: 'pi-shield',
          routerLink: '/settings/security',
          roles: [EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]
        }
      ]
    }
  ];

  filteredMenuItems = computed(() => {
    return this.menuItems.filter(item => this.hasPermission(item['roles']));
  });

  hasPermission(roles: EmployeeRole[]): boolean {
    const userRole = this.userRole;
    return !!userRole && roles.includes(userRole);
  }

  toggleGroup(item: MenuItem) {
    if (this.collapsed) return; // Don't toggle in collapsed mode
    item.expanded = !item.expanded;
  }
}