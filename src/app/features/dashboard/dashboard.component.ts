import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary, FeeInvoice, Payment } from '../../core/models';
import { StatusLabelPipe } from '../../shared/pipes/status-label.pipe';

// ── Detail Drawer Component ─────────────────────────────────────────────────
import { Component as Comp, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Comp({
  selector: 'app-kpi-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule, MatTableModule, MatDialogModule, StatusLabelPipe],
  template: `
    <div style="padding:0">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #e2e8f0">
        <div>
          <h2 style="margin:0;font-size:1.125rem;font-weight:700;color:#0f172a">{{ data.title }}</h2>
          <p style="margin:4px 0 0;font-size:.8rem;color:#64748b">{{ data.subtitle }}</p>
        </div>
        <button mat-icon-button mat-dialog-close><mat-icon>close</mat-icon></button>
      </div>

      <div style="padding:20px 24px;max-height:70vh;overflow-y:auto">

        <!-- Invoices list -->
        @if (data.type === 'invoices') {
          <table mat-table [dataSource]="data.items">
            <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice</th><td mat-cell *matCellDef="let i"><span style="font-size:.8rem;font-weight:600;font-family:monospace">{{ i.invoiceNumber }}</span></td></ng-container>
            <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let i"><div style="font-weight:600;font-size:.8rem">{{ i.student?.user?.firstName }} {{ i.student?.user?.lastName }}</div><div style="font-size:.72rem;color:#64748b">{{ i.student?.registrationNumber }}</div></td></ng-container>
            <ng-container matColumnDef="due"><th mat-header-cell *matHeaderCellDef>Due Date</th><td mat-cell *matCellDef="let i" style="font-size:.8rem" [style.color]="isPast(i.dueDate) ? '#dc2626' : '#0f172a'">{{ i.dueDate | date:'mediumDate' }}</td></ng-container>
            <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let i" style="font-weight:700;color:#dc2626">{{ i.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i"><span class="badge" [class]="'badge-' + i.status">{{ i.status | statusLabel }}</span></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['invoice','student','due','amount','status']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['invoice','student','due','amount','status'];"></tr>
          </table>
        }

        <!-- Defaulters list -->
        @if (data.type === 'defaulters') {
          <table mat-table [dataSource]="data.items">
            <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let d"><div style="font-weight:600;font-size:.8rem">{{ d.firstName }} {{ d.lastName }}</div><div style="font-size:.72rem;color:#64748b">{{ d.registrationNumber }}</div></td></ng-container>
            <ng-container matColumnDef="class"><th mat-header-cell *matHeaderCellDef>Class</th><td mat-cell *matCellDef="let d" style="font-size:.8rem">{{ d.className || '—' }}</td></ng-container>
            <ng-container matColumnDef="due"><th mat-header-cell *matHeaderCellDef>Total Due</th><td mat-cell *matCellDef="let d" style="font-weight:700;color:#dc2626">{{ d.totalDue | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="invoices"><th mat-header-cell *matHeaderCellDef>Invoices</th><td mat-cell *matCellDef="let d"><span class="badge badge-overdue">{{ d.pendingInvoices }}</span></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['name','class','due','invoices']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['name','class','due','invoices'];"></tr>
          </table>
        }

        <!-- Payments list -->
        @if (data.type === 'payments') {
          <table mat-table [dataSource]="data.items">
            <ng-container matColumnDef="receipt"><th mat-header-cell *matHeaderCellDef>Receipt</th><td mat-cell *matCellDef="let p" style="font-size:.8rem;font-family:monospace">{{ p.receiptNumber }}</td></ng-container>
            <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let p" style="font-size:.8rem;font-weight:600">{{ p.student?.user?.firstName }} {{ p.student?.user?.lastName }}</td></ng-container>
            <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let p" style="font-weight:700;color:#16a34a">{{ p.amount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
            <ng-container matColumnDef="method"><th mat-header-cell *matHeaderCellDef>Method</th><td mat-cell *matCellDef="let p" style="font-size:.8rem;text-transform:capitalize">{{ p.method | statusLabel }}</td></ng-container>
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let p" style="font-size:.8rem">{{ p.paymentDate | date:'mediumDate' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['receipt','student','amount','method','date']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['receipt','student','amount','method','date'];"></tr>
          </table>
        }

        @if (!data.items?.length) {
          <div style="text-align:center;padding:40px;color:#94a3b8">
            <mat-icon style="font-size:40px;height:40px;width:40px">info</mat-icon>
            <p>No records found</p>
          </div>
        }
      </div>
    </div>
  `
})
export class KpiDetailDialogComponent {
  data = inject<any>(MAT_DIALOG_DATA);
  isPast(d: string) { return new Date(d) < new Date(); }
}

// ── Dashboard Component ──────────────────────────────────────────────────────
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatDividerModule, MatTableModule,
    MatDialogModule, MatProgressSpinnerModule, MatChipsModule, StatusLabelPipe
  ],
  template: `
    <div class="page-container">

      <!-- Header -->
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Finance Dashboard</h1>
          <p class="section-subtitle">Welcome back, {{ auth.currentUser()?.firstName }}!</p>
        </div>
        <div class="flex-gap">
          <button mat-stroked-button routerLink="/invoices/bulk-generate">
            <mat-icon>auto_awesome</mat-icon> Bulk Generate
          </button>
          <button mat-flat-button color="primary" routerLink="/payments/new">
            <mat-icon>payments</mat-icon> Record Payment
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><mat-progress-bar mode="indeterminate" /></div>
      } @else if (data()) {

        <!-- KPI Cards — all clickable to open detail drawer -->
        <div class="kpi-grid">

          <div class="kpi-card kpi-blue" style="cursor:default">
            <div class="kpi-icon"><mat-icon>people</mat-icon></div>
            <span class="kpi-label">Total Students</span>
            <span class="kpi-value">{{ data()!.summary.totalStudents | number }}</span>
            <span class="kpi-sub">Active enrollments</span>
          </div>

          <div class="kpi-card kpi-purple clickable-kpi" (click)="openInvoicedDetail()">
            <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
            <span class="kpi-label">Total Invoiced</span>
            <span class="kpi-value">{{ fmt(data()!.summary.totalInvoiced) }}</span>
            <span class="kpi-sub">Click to view invoices →</span>
          </div>

          <div class="kpi-card kpi-green clickable-kpi" (click)="openCollectedDetail()">
            <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
            <span class="kpi-label">Collected</span>
            <span class="kpi-value">{{ fmt(data()!.summary.totalCollected) }}</span>
            <span class="kpi-sub">{{ data()!.summary.collectionRate }} · Click to view →</span>
          </div>

          <div class="kpi-card kpi-orange clickable-kpi" (click)="openOutstandingDetail()">
            <div class="kpi-icon"><mat-icon>pending_actions</mat-icon></div>
            <span class="kpi-label">Outstanding</span>
            <span class="kpi-value">{{ fmt(data()!.summary.totalOutstanding) }}</span>
            <span class="kpi-sub">Click to view pending →</span>
          </div>

          <div class="kpi-card kpi-red clickable-kpi" (click)="openOverdueDetail()">
            <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
            <span class="kpi-label">Overdue</span>
            <span class="kpi-value">{{ fmt(data()!.summary.overdueAmount) }}</span>
            <span class="kpi-sub">Click to view overdue →</span>
          </div>

          <div class="kpi-card kpi-cyan clickable-kpi" (click)="openDefaultersDetail()">
            <div class="kpi-icon"><mat-icon>group_off</mat-icon></div>
            <span class="kpi-label">Defaulters</span>
            <span class="kpi-value">{{ data()!.summary.defaulterCount | number }}</span>
            <span class="kpi-sub">Click to view list →</span>
          </div>

        </div>

        <!-- Collection Rate Bar -->
        <mat-card class="mb-6">
          <mat-card-content>
            <div class="flex-between mb-4">
              <div>
                <h3 style="font-weight:600;font-size:.95rem">Collection Rate</h3>
                <p class="text-muted">Progress towards total invoiced amount</p>
              </div>
              <span style="font-size:1.5rem;font-weight:700;color:#16a34a">{{ data()!.summary.collectionRate }}</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="collectionPercent()" color="primary" style="height:10px;border-radius:5px" />
            <div class="flex-between mt-4" style="font-size:.8rem;color:#64748b">
              <span>Collected: <strong style="color:#0f172a">{{ fmt(data()!.summary.totalCollected) }}</strong></span>
              <span>Invoiced: <strong style="color:#0f172a">{{ fmt(data()!.summary.totalInvoiced) }}</strong></span>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="grid-2">
          <!-- Monthly Trend -->
          <mat-card>
            <mat-card-header><mat-card-title>Monthly Collection Trend</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (data()!.charts.monthlyTrend.length) {
                <div class="bar-chart">
                  @for (m of data()!.charts.monthlyTrend; track m.month) {
                    <div class="bar-item">
                      <div class="bar-wrap">
                        <div class="bar-fill" [style.height.%]="barHeight(m.collected)">
                          <span class="bar-tip">{{ fmt(m.collected) }}</span>
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
            <mat-card-header><mat-card-title>Payment Methods</mat-card-title></mat-card-header>
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
                          <span style="font-size:.85rem;font-weight:700">{{ fmt(+m.amount) }}</span>
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
          <mat-card>
            <mat-card-header>
              <mat-card-title>Class-wise Summary</mat-card-title>
              <div class="card-header-action"><a mat-button routerLink="/reports/class-wise">View full report</a></div>
            </mat-card-header>
            <mat-card-content style="padding:0">
              <table mat-table [dataSource]="classData()">
                <ng-container matColumnDef="class"><th mat-header-cell *matHeaderCellDef>Class</th><td mat-cell *matCellDef="let r">{{ r.className || '—' }}</td></ng-container>
                <ng-container matColumnDef="collected"><th mat-header-cell *matHeaderCellDef>Collected</th><td mat-cell *matCellDef="let r" style="color:#16a34a;font-weight:600">{{ fmt(+r.collected) }}</td></ng-container>
                <ng-container matColumnDef="outstanding"><th mat-header-cell *matHeaderCellDef>Outstanding</th><td mat-cell *matCellDef="let r" style="color:#dc2626;font-weight:600">{{ fmt(+r.outstanding) }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="classColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: classColumns;"></tr>
              </table>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Recent Payments</mat-card-title>
              <div class="card-header-action"><a mat-button routerLink="/payments">View all</a></div>
            </mat-card-header>
            <mat-card-content style="padding:0">
              @if (data()!.recentPayments.length) {
                <div class="payment-list">
                  @for (p of data()!.recentPayments.slice(0,6); track p.id) {
                    <div class="payment-row">
                      <div class="payment-avatar">{{ (p.student?.user?.firstName||'U')[0] }}{{ (p.student?.user?.lastName||'U')[0] }}</div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ p.student?.user?.firstName }} {{ p.student?.user?.lastName }}
                        </div>
                        <div style="font-size:.75rem;color:#64748b">{{ p.receiptNumber }}</div>
                      </div>
                      <div style="text-align:right">
                        <div style="font-weight:700;color:#16a34a;font-size:.9rem">{{ fmt(p.amount) }}</div>
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
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .clickable-kpi { cursor:pointer; transition:transform .15s,box-shadow .15s; }
    .clickable-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.12); }
    .bar-chart { display:flex; align-items:flex-end; gap:8px; height:140px; padding:8px 0; }
    .bar-item { display:flex; flex-direction:column; align-items:center; flex:1; gap:4px; }
    .bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
    .bar-fill { width:100%; min-height:4px; background:#2563eb; border-radius:4px 4px 0 0; position:relative; transition:height .3s; }
    .bar-fill:hover .bar-tip { display:block; }
    .bar-tip { display:none; position:absolute; top:-28px; left:50%; transform:translateX(-50%); background:#0f172a; color:#fff; font-size:.65rem; padding:2px 6px; border-radius:4px; white-space:nowrap; z-index:10; }
    .bar-label { font-size:.72rem; color:#64748b; }
    .empty-chart { text-align:center; color:#94a3b8; padding:32px; font-size:.875rem; }
    .method-list { display:flex; flex-direction:column; gap:16px; }
    .method-item { display:flex; align-items:center; gap:12px; }
    .method-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; mat-icon { font-size:18px; } }
    .method-cash { background:#dcfce7; color:#16a34a; }
    .method-bank_transfer { background:#dbeafe; color:#2563eb; }
    .method-cheque { background:#fef9c3; color:#a16207; }
    .method-online { background:#f3e8ff; color:#9333ea; }
    .method-pos { background:#ffedd5; color:#ea580c; }
    .card-header-action { margin-left:auto; }
    .payment-list { display:flex; flex-direction:column; }
    .payment-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f1f5f9; }
    .payment-row:last-child { border-bottom:none; }
    .payment-row:hover { background:#f8fafc; }
    .payment-avatar { width:36px; height:36px; background:#dbeafe; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:#2563eb; flex-shrink:0; }
  `]
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  loading = signal(true);
  data = signal<DashboardSummary | null>(null);
  classColumns = ['class', 'collected', 'outstanding'];

  ngOnInit() {
    this.api.get<any>('/reports/dashboard', { academicYearId: '' }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  collectionPercent(): number {
    const d = this.data()?.summary;
    if (!d?.totalInvoiced) return 0;
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

  methodIcon(m: string): string {
    const map: Record<string, string> = { cash: 'money', bank_transfer: 'account_balance', cheque: 'article', online: 'language', pos: 'point_of_sale' };
    return map[m] || 'payments';
  }

  fmt(n: number): string {
    if (!n) return '₨0';
    if (n >= 1_000_000) return `₨${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₨${(n / 1_000).toFixed(0)}K`;
    return `₨${n.toFixed(0)}`;
  }

  // ── KPI Detail Drawers ──────────────────────────────────────────────────────

  openInvoicedDetail() {
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, {}).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'All Invoices', subtitle: `${r.meta.total} total invoices`, type: 'invoices', items: r.data }
      });
    });
  }

  openCollectedDetail() {
    this.api.getPaginated<Payment>('/payments', { limit: 50 }, { status: 'completed' }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Collected Payments', subtitle: `${r.meta.total} completed payments`, type: 'payments', items: r.data }
      });
    });
  }

  openOutstandingDetail() {
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, { status: 'issued' }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Outstanding Invoices', subtitle: 'Unpaid & partially paid invoices', type: 'invoices', items: r.data }
      });
    });
  }

  openOverdueDetail() {
    this.api.getPaginated<FeeInvoice>('/fee-invoices', { limit: 50 }, { status: 'overdue' }).subscribe(r => {
      this.dialog.open(KpiDetailDialogComponent, {
        width: '900px', maxHeight: '90vh',
        data: { title: 'Overdue Invoices', subtitle: 'Invoices past their due date', type: 'invoices', items: r.data }
      });
    });
  }

  openDefaultersDetail() {
    this.api.get<any>('/reports/defaulters', {}).subscribe(r => {
      const defaulters = r?.defaulters || [];
      this.dialog.open(KpiDetailDialogComponent, {
        width: '800px', maxHeight: '90vh',
        data: { title: 'Defaulters', subtitle: `${defaulters.length} students with outstanding dues`, type: 'defaulters', items: defaulters }
      });
    });
  }
}
