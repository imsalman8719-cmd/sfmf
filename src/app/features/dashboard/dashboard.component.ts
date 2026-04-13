import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary, InvoiceStatus, PaymentMethod } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatDividerModule, MatChipsModule, MatTableModule
  ],
  template: `
    <div class="page-container">

      <!-- Header -->
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Finance Dashboard</h1>
          <p class="section-subtitle">Welcome back, {{ auth.currentUser()?.firstName }}! Here's your financial overview.</p>
        </div>
        <div class="flex-gap">
          <button mat-stroked-button routerLink="/invoices/bulk-generate">
            <mat-icon>add_circle</mat-icon> Bulk Generate
          </button>
          <button mat-flat-button color="primary" routerLink="/payments/new">
            <mat-icon>payments</mat-icon> Record Payment
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      } @else if (data()) {
        <!-- KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-blue">
            <div class="kpi-icon"><mat-icon>people</mat-icon></div>
            <span class="kpi-label">Total Students</span>
            <span class="kpi-value">{{ data()!.summary.totalStudents | number }}</span>
            <span class="kpi-sub">Active enrollments</span>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
            <span class="kpi-label">Total Invoiced</span>
            <span class="kpi-value">{{ formatAmount(data()!.summary.totalInvoiced) }}</span>
            <span class="kpi-sub">This academic year</span>
          </div>
          <div class="kpi-card kpi-green">
            <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
            <span class="kpi-label">Collected</span>
            <span class="kpi-value">{{ formatAmount(data()!.summary.totalCollected) }}</span>
            <span class="kpi-sub">{{ data()!.summary.collectionRate }} collection rate</span>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><mat-icon>pending_actions</mat-icon></div>
            <span class="kpi-label">Outstanding</span>
            <span class="kpi-value">{{ formatAmount(data()!.summary.totalOutstanding) }}</span>
            <span class="kpi-sub">Pending payments</span>
          </div>
          <div class="kpi-card kpi-red">
            <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
            <span class="kpi-label">Overdue</span>
            <span class="kpi-value">{{ formatAmount(data()!.summary.overdueAmount) }}</span>
            <span class="kpi-sub">Past due date</span>
          </div>
          <div class="kpi-card kpi-cyan">
            <div class="kpi-icon"><mat-icon>group_off</mat-icon></div>
            <span class="kpi-label">Defaulters</span>
            <span class="kpi-value">{{ data()!.summary.defaulterCount | number }}</span>
            <span class="kpi-sub">
              <a routerLink="/reports/defaulters" class="link-subtle">View list →</a>
            </span>
          </div>
        </div>

        <!-- Collection Rate Bar -->
        <mat-card class="mb-6">
          <mat-card-content>
            <div class="flex-between mb-4">
              <div>
                <h3 style="font-weight:600;font-size:.95rem">Overall Collection Rate</h3>
                <p class="text-muted">Progress towards annual fee target</p>
              </div>
              <span style="font-size:1.5rem;font-weight:700;color:#16a34a">{{ data()!.summary.collectionRate }}</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="collectionPercent()" color="primary" style="height:10px;border-radius:5px" />
            <div class="flex-between mt-4" style="font-size:.8rem;color:#64748b">
              <span>Collected: <strong style="color:#0f172a">{{ formatAmount(data()!.summary.totalCollected) }}</strong></span>
              <span>Total: <strong style="color:#0f172a">{{ formatAmount(data()!.summary.totalInvoiced) }}</strong></span>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="grid-2">
          <!-- Monthly Trend -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Monthly Collection Trend</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.charts.monthlyTrend.length) {
                <div class="bar-chart">
                  @for (m of data()!.charts.monthlyTrend; track m.month) {
                    <div class="bar-item">
                      <div class="bar-wrap">
                        <div class="bar-fill" [style.height.%]="barHeight(m.collected)">
                          <span class="bar-tip">{{ formatAmount(m.collected) }}</span>
                        </div>
                      </div>
                      <span class="bar-label">{{ m.monthName.slice(0,3) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-chart">No collection data yet</div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Payment Methods -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Payment Methods</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.charts.paymentMethodBreakdown.length) {
                <div class="method-list">
                  @for (m of data()!.charts.paymentMethodBreakdown; track m.method) {
                    <div class="method-item">
                      <div class="method-icon" [class]="'method-' + m.method">
                        <mat-icon>{{ methodIcon(m.method) }}</mat-icon>
                      </div>
                      <div style="flex:1">
                        <div class="flex-between" style="margin-bottom:4px">
                          <span style="font-size:.85rem;font-weight:600;text-transform:capitalize">{{ m.method.replace('_',' ') }}</span>
                          <span style="font-size:.85rem;font-weight:700">{{ formatAmount(+m.amount) }}</span>
                        </div>
                        <mat-progress-bar mode="determinate" [value]="methodPercent(+m.amount)" />
                        <span style="font-size:.75rem;color:#64748b">{{ m.count }} transactions</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-chart">No payment data yet</div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Class-wise + Recent Payments -->
        <div class="grid-2 mt-6">
          <!-- Class-wise -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Class-wise Summary</mat-card-title>
              <div class="card-header-action">
                <a mat-button routerLink="/reports/class-wise">View all</a>
              </div>
            </mat-card-header>
            <mat-card-content style="padding:0">
              <table mat-table [dataSource]="classData()">
                <ng-container matColumnDef="class">
                  <th mat-header-cell *matHeaderCellDef>Class</th>
                  <td mat-cell *matCellDef="let r">{{ r.className || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="collected">
                  <th mat-header-cell *matHeaderCellDef>Collected</th>
                  <td mat-cell *matCellDef="let r" style="color:#16a34a;font-weight:600">{{ formatAmount(+r.collected) }}</td>
                </ng-container>
                <ng-container matColumnDef="outstanding">
                  <th mat-header-cell *matHeaderCellDef>Outstanding</th>
                  <td mat-cell *matCellDef="let r" style="color:#dc2626;font-weight:600">{{ formatAmount(+r.outstanding) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="classColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: classColumns;"></tr>
              </table>
            </mat-card-content>
          </mat-card>

          <!-- Recent Payments -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Recent Payments</mat-card-title>
              <div class="card-header-action">
                <a mat-button routerLink="/payments">View all</a>
              </div>
            </mat-card-header>
            <mat-card-content style="padding:0">
              @if (data()!.recentPayments.length) {
                <div class="payment-list">
                  @for (p of data()!.recentPayments.slice(0,6); track p.id) {
                    <div class="payment-row">
                      <div class="payment-avatar">
                        {{ (p.student?.user?.firstName || 'U')[0] }}{{ (p.student?.user?.lastName || 'U')[0] }}
                      </div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ p.student?.user?.firstName }} {{ p.student?.user?.lastName }}
                        </div>
                        <div style="font-size:.75rem;color:#64748b">{{ p.receiptNumber }}</div>
                      </div>
                      <div style="text-align:right">
                        <div style="font-weight:700;color:#16a34a;font-size:.9rem">{{ formatAmount(p.amount) }}</div>
                        <div style="font-size:.72rem;color:#94a3b8;text-transform:capitalize">{{ p.method.replace('_',' ') }}</div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-chart">No recent payments</div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
      @media(max-width:900px) { grid-template-columns: 1fr; } }

    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 140px; padding: 8px 0; }
    .bar-item { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
    .bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .bar-fill {
      width: 100%; min-height: 4px; background: #2563eb; border-radius: 4px 4px 0 0;
      position: relative; transition: height .3s;
      &:hover .bar-tip { display: block; }
    }
    .bar-tip {
      display: none; position: absolute; top: -28px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff; font-size: .65rem; padding: 2px 6px;
      border-radius: 4px; white-space: nowrap; z-index: 10;
    }
    .bar-label { font-size: .72rem; color: #64748b; }
    .empty-chart { text-align: center; color: #94a3b8; padding: 32px; font-size: .875rem; }

    .method-list { display: flex; flex-direction: column; gap: 16px; }
    .method-item { display: flex; align-items: center; gap: 12px; }
    .method-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; }
      &.method-cash { background: #dcfce7; color: #16a34a; }
      &.method-bank_transfer { background: #dbeafe; color: #2563eb; }
      &.method-cheque { background: #fef9c3; color: #a16207; }
      &.method-online { background: #f3e8ff; color: #9333ea; }
      &.method-pos { background: #ffedd5; color: #ea580c; }
    }

    .card-header-action { margin-left: auto; }

    .payment-list { display: flex; flex-direction: column; }
    .payment-row {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      &:last-child { border-bottom: none; }
      &:hover { background: #f8fafc; }
    }
    .payment-avatar {
      width: 36px; height: 36px; background: #dbeafe; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700; color: #2563eb; flex-shrink: 0;
    }
    .link-subtle { color: #2563eb; text-decoration: none; font-size: .8rem;
      &:hover { text-decoration: underline; } }
  `]
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);

  loading = signal(true);
  data = signal<DashboardSummary | null>(null);
  classColumns = ['class', 'collected', 'outstanding'];

  ngOnInit() {
    this.api.get<any>('/reports/dashboard', { academicYearId: '' }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  collectionPercent(): number {
    const d = this.data()?.summary;
    if (!d || !d.totalInvoiced) return 0;
    return Math.min(100, (d.totalCollected / d.totalInvoiced) * 100);
  }

  classData() { return (this.data()?.charts.classWiseSummary || []).slice(0, 6); }

  barHeight(val: number): number {
    const max = Math.max(...(this.data()?.charts.monthlyTrend.map(m => m.collected) || [1]));
    return max ? (val / max) * 100 : 0;
  }

  methodPercent(val: number): number {
    const total = this.data()?.charts.paymentMethodBreakdown.reduce((s, m) => s + +m.amount, 0) || 1;
    return (val / total) * 100;
  }

  methodIcon(method: string): string {
    const map: Record<string, string> = { cash: 'money', bank_transfer: 'account_balance', cheque: 'article', online: 'language', pos: 'point_of_sale' };
    return map[method] || 'payments';
  }

  formatAmount(n: number): string {
    if (n >= 1_000_000) return `₨${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₨${(n / 1_000).toFixed(0)}K`;
    return `₨${n?.toFixed(0) || 0}`;
  }
}
