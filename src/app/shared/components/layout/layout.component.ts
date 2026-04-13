import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: UserRole[];
  badge?: number;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive, RouterOutlet,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatDividerModule, MatBadgeModule, MatTooltipModule
  ],
  template: `
    <mat-sidenav-container class="app-container">

      <!-- ── Sidebar ─────────────────────────────────────────────────── -->
      <mat-sidenav #sidenav mode="side" [opened]="sidenavOpen()" class="app-sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">
            <mat-icon>school</mat-icon>
          </div>
          <div class="brand-text">
            <span class="brand-name">EduFees</span>
            <span class="brand-sub">Management System</span>
          </div>
        </div>

        <div class="sidebar-scroll">
          <nav class="sidebar-nav">
            @for (item of visibleNavItems(); track item.route) {
              <a mat-list-item
                 [routerLink]="item.route"
                 routerLinkActive="active"
                 class="nav-item"
                 [matTooltip]="!sidenavOpen() ? item.label : ''"
                 matTooltipPosition="right">
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="nav-badge">{{ item.badge }}</span>
                }
              </a>
            }
          </nav>
        </div>

        <div class="sidebar-footer">
          <mat-divider />
          <div class="user-info">
            <div class="user-avatar">{{ initials() }}</div>
            <div class="user-details">
              <span class="user-name">{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</span>
              <span class="user-role">{{ formatRole(auth.currentUser()?.role) }}</span>
            </div>
          </div>
        </div>
      </mat-sidenav>

      <!-- ── Main ───────────────────────────────────────────────────── -->
      <mat-sidenav-content class="app-content">

        <!-- Header -->
        <mat-toolbar class="app-header">
          <button mat-icon-button (click)="toggleSidenav()" class="menu-btn">
            <mat-icon>{{ sidenavOpen() ? 'menu_open' : 'menu' }}</mat-icon>
          </button>

          <div class="header-title">
            <span class="page-title">{{ currentPageTitle() }}</span>
          </div>

          <span class="spacer"></span>

          <div class="header-actions">
            <!-- User Menu -->
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-btn">
              <div class="header-avatar">{{ initials() }}</div>
            </button>
            <mat-menu #userMenu="matMenu" class="user-menu">
              <div class="menu-user-header">
                <strong>{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</strong>
                <small>{{ auth.currentUser()?.email }}</small>
              </div>
              <mat-divider />
              <button mat-menu-item (click)="logout()">
                <mat-icon color="warn">logout</mat-icon>
                <span>Sign Out</span>
              </button>
            </mat-menu>
          </div>
        </mat-toolbar>

        <!-- Page Content -->
        <main class="main-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container { height: 100vh; }

    /* ── Sidebar ── */
    .app-sidebar {
      width: 260px;
      background: #0f172a;
      color: #fff;
      border-right: none !important;
      display: flex;
      flex-direction: column;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .brand-icon {
      width: 40px; height: 40px;
      background: #2563eb;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #fff; font-size: 22px; }
    }
    .brand-name { font-size: 1rem; font-weight: 700; color: #fff; display: block; }
    .brand-sub { font-size: 0.7rem; color: #64748b; display: block; }

    .sidebar-scroll { flex: 1; overflow-y: auto; padding: 12px 8px; }

    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }

    .nav-item {
      display: flex !important;
      align-items: center;
      gap: 10px;
      padding: 10px 12px !important;
      border-radius: 8px !important;
      color: #94a3b8 !important;
      text-decoration: none;
      transition: all .15s;
      cursor: pointer;
      min-height: 40px !important;
      height: auto !important;

      mat-icon { font-size: 20px; color: #94a3b8; flex-shrink: 0; }
      .nav-label { font-size: 0.875rem; font-weight: 500; white-space: nowrap; }

      &:hover { background: rgba(255,255,255,.06) !important; color: #e2e8f0 !important; mat-icon { color: #e2e8f0; } }
      &.active { background: rgba(37,99,235,.25) !important; color: #93c5fd !important;
        mat-icon { color: #93c5fd; }
        .nav-label { font-weight: 600; }
      }
    }

    .nav-badge {
      margin-left: auto;
      background: #dc2626;
      color: #fff;
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid rgba(255,255,255,.08);
      mat-divider { border-color: rgba(255,255,255,.08); margin-bottom: 8px; }
    }

    .user-info {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 8px;
      border-radius: 8px;
    }
    .user-avatar {
      width: 34px; height: 34px;
      background: #1e40af;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #93c5fd;
      flex-shrink: 0;
    }
    .user-name { font-size: 0.8rem; font-weight: 600; color: #e2e8f0; display: block; }
    .user-role { font-size: 0.7rem; color: #64748b; display: block; text-transform: capitalize; }

    /* ── Header ── */
    .app-header {
      height: 64px;
      background: #fff !important;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
      color: #0f172a !important;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .menu-btn { margin-right: 8px; }
    .page-title { font-size: 1rem; font-weight: 600; color: #0f172a; }
    .spacer { flex: 1; }

    .header-avatar {
      width: 34px; height: 34px;
      background: #dbeafe;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #2563eb;
      cursor: pointer;
    }

    /* ── Content ── */
    .main-content {
      min-height: calc(100vh - 64px);
      background: #f8fafc;
    }

    /* User menu */
    .menu-user-header {
      padding: 12px 16px 8px;
      display: flex; flex-direction: column; gap: 2px;
      strong { font-size: 0.875rem; color: #0f172a; }
      small { font-size: 0.75rem; color: #64748b; }
    }
  `]
})
export class LayoutComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  sidenavOpen = signal(true);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',      route: '/dashboard' },
    { label: 'Academic Years',  icon: 'calendar_today', route: '/academic-years', roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE] },
    { label: 'Classes',         icon: 'class',          route: '/classes',        roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.ADMISSION, UserRole.TEACHER] },
    { label: 'Students',        icon: 'people',         route: '/students',       roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.ADMISSION, UserRole.TEACHER] },
    { label: 'Fee Structures',  icon: 'receipt_long',   route: '/fee-structures', roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE] },
    { label: 'Invoices',        icon: 'description',    route: '/invoices',       roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.TEACHER] },
    { label: 'Payments',        icon: 'payments',       route: '/payments',       roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE] },
    { label: 'Reports',         icon: 'bar_chart',      route: '/reports',        roles: [UserRole.SUPER_ADMIN, UserRole.FINANCE] },
    { label: 'Users',           icon: 'manage_accounts', route: '/users',         roles: [UserRole.SUPER_ADMIN] },
  ];

  visibleNavItems = computed(() => {
    const role = this.auth.currentUser()?.role as UserRole;
    return this.navItems.filter(item => !item.roles || item.roles.includes(role));
  });

  initials = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  });

  currentPageTitle = computed(() => {
    const url = this.router.url;
    const item = this.navItems.find(n => url.startsWith(n.route));
    return item?.label ?? 'Dashboard';
  });

  toggleSidenav() { this.sidenavOpen.update(v => !v); }

  formatRole(role?: string): string {
    return role ? role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  }

  logout() { this.auth.logout(); }
}
