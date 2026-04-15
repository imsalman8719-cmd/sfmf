import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FeeInvoice, InvoiceStatus, UserRole, AcademicYear } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatMenuModule, MatTooltipModule, MatChipsModule, StatusLabelPipe,MatDivider
  ],
  template: `
    <div class="page-container">

      <!-- Header — no generate buttons -->
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Fee Invoices</h1>
          <p class="section-subtitle">
            {{ total() | number }} invoices
            @if (totalOutstanding() > 0) { · <span style="color:#dc2626">PKR {{ totalOutstanding() | number:'1.0-0' }} outstanding</span> }
          </p>
        </div>
      </div>

      <!-- Status chip filters -->
      <div class="status-chips mb-4">
        <button mat-stroked-button
                [color]="statusCtrl.value === '' ? 'primary' : undefined"
                [class.active-chip]="statusCtrl.value === ''"
                (click)="statusCtrl.setValue('')">
          All
        </button>
        @for (s of quickStatuses; track s.value) {
          <button mat-stroked-button
                  [class.active-chip]="statusCtrl.value === s.value"
                  (click)="statusCtrl.setValue(s.value)">
            <span class="chip-dot" [class]="'dot-' + s.value"></span>
            {{ s.label }}
          </button>
        }
      </div>

      <div class="table-container">
        <!-- Filters row -->
        <div class="table-filters">
          <mat-form-field>
            <mat-label>Search</mat-label>
            <input matInput [formControl]="searchCtrl" placeholder="Invoice #, student name…">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field style="min-width:180px">
            <mat-label>Academic Year</mat-label>
            <mat-select [formControl]="yearCtrl">
              <mat-option value="">All Years</mat-option>
              @for (y of years(); track y.id) { <mat-option [value]="y.id">{{ y.name }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field style="min-width:130px">
            <mat-label>Month</mat-label>
            <mat-select [formControl]="monthCtrl">
              <mat-option value="">All Months</mat-option>
              @for (m of months; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Table -->
        <table mat-table [dataSource]="invoices()">

          <ng-container matColumnDef="invoiceNo">
            <th mat-header-cell *matHeaderCellDef>Invoice #</th>
            <td mat-cell *matCellDef="let i">
              <a [routerLink]="[i.id]" class="inv-link text-mono">{{ i.invoiceNumber }}</a>
            </td>
          </ng-container>

          <ng-container matColumnDef="student">
            <th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let i">
              <div style="font-weight:600;font-size:.875rem">{{ i.student?.user?.firstName }} {{ i.student?.user?.lastName }}</div>
              <div style="font-size:.75rem;color:#64748b">{{ i.student?.registrationNumber }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="period">
            <th mat-header-cell *matHeaderCellDef>Period</th>
            <td mat-cell *matCellDef="let i">{{ i.billingLabel || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="dueDate">
            <th mat-header-cell *matHeaderCellDef>Due Date</th>
            <td mat-cell *matCellDef="let i"
                [class.overdue-date]="isPast(i.dueDate) && i.status !== 'paid' && i.status !== 'cancelled'">
              {{ i.dueDate | date:'mediumDate' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef>Total</th>
            <td mat-cell *matCellDef="let i" style="font-weight:600">
              {{ i.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="paid">
            <th mat-header-cell *matHeaderCellDef>Paid</th>
            <td mat-cell *matCellDef="let i" style="color:#16a34a">
              {{ i.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef>Balance</th>
            <td mat-cell *matCellDef="let i"
                [style.color]="i.balanceAmount > 0 ? '#dc2626' : '#16a34a'"
                style="font-weight:600">
              {{ i.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let i">
              <span class="badge" [class]="'badge-' + i.status">{{ i.status | statusLabel }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let i">
              <a mat-icon-button [routerLink]="[i.id]" matTooltip="View detail">
                <mat-icon>visibility</mat-icon>
              </a>
              @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.FINANCE)) {
                <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="Actions">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu>
                  @if (i.status !== 'paid' && i.status !== 'cancelled') {
                    <button mat-menu-item [routerLink]="['/payments/new']" [queryParams]="{ invoiceId: i.id }">
                      <mat-icon>payments</mat-icon> Record Payment
                    </button>
                    <button mat-menu-item [routerLink]="['/invoices/waivers']" [queryParams]="{ invoiceId: i.id }">
                      <mat-icon>discount</mat-icon> Apply Waiver
                    </button>
                    <mat-divider />
                    <button mat-menu-item (click)="cancelInvoice(i)">
                      <mat-icon color="warn">cancel</mat-icon> Cancel Invoice
                    </button>
                  }
                </mat-menu>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>

          <!-- Empty state -->
          <tr class="mat-row" *matNoDataRow>
            <td [colSpan]="columns.length" class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <p>No invoices found for the selected filters</p>
            </td>
          </tr>
        </table>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons />
      </div>
    </div>
  `,
  styles: [`
    .status-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .status-chips button { border-radius: 20px !important; font-size: .8rem; }
    .active-chip { background: #2563eb !important; color: #fff !important; }
    .chip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
    .dot-issued   { background: #2563eb; }
    .dot-paid     { background: #16a34a; }
    .dot-overdue  { background: #dc2626; }
    .dot-partially_paid { background: #f59e0b; }
    .dot-cancelled { background: #94a3b8; }
    .inv-link { color: #2563eb; text-decoration: none; font-weight: 600; }
    .inv-link:hover { text-decoration: underline; }
    .overdue-date { color: #dc2626; font-weight: 600; }
    .empty-state { text-align: center; padding: 48px; color: #94a3b8;
      mat-icon { font-size: 40px; height: 40px; width: 40px; display: block; margin: 0 auto 12px; }
      p { margin: 0; }
    }
  `],
})
export class InvoicesListComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  UserRole = UserRole;
  columns = ['invoiceNo', 'student', 'period', 'dueDate', 'total', 'paid', 'balance', 'status', 'actions'];

  quickStatuses = [
    { value: InvoiceStatus.ISSUED,          label: 'Issued' },
    { value: InvoiceStatus.PARTIALLY_PAID,  label: 'Partial' },
    { value: InvoiceStatus.PAID,            label: 'Paid' },
    { value: InvoiceStatus.OVERDUE,         label: 'Overdue' },
    { value: InvoiceStatus.CANCELLED,       label: 'Cancelled' },
  ];

  months = [1,2,3,4,5,6,7,8,9,10,11,12].map(v => ({
    v, l: new Date(2000, v-1, 1).toLocaleString('en', { month: 'long' }),
  }));

  invoices = signal<FeeInvoice[]>([]);
  years = signal<AcademicYear[]>([]);
  total = signal(0);
  totalOutstanding = signal(0);
  page = 1;
  pageSize = 20;

  searchCtrl = new FormControl('');
  statusCtrl = new FormControl('');
  yearCtrl   = new FormControl('');
  monthCtrl  = new FormControl('');

  ngOnInit() {
    // Pre-fill from query params (e.g. from student detail page)
    const qp = this.route.snapshot.queryParams;
    if (qp['status']) this.statusCtrl.setValue(qp['status']);
    if (qp['academicYearId']) this.yearCtrl.setValue(qp['academicYearId']);

    this.api.get<any>('/academic-years').subscribe(r => {
      const years = Array.isArray(r) ? r : r.data || [];
      this.years.set(years);
      // Auto-select current year if none set
      if (!this.yearCtrl.value) {
        const cur = years.find((y: AcademicYear) => y.isCurrent);
        if (cur) this.yearCtrl.setValue(cur.id);
      }
    });

    this.load();

    [this.searchCtrl, this.statusCtrl, this.yearCtrl, this.monthCtrl].forEach(c => {
      c.valueChanges
        .pipe(debounceTime(c === this.searchCtrl ? 350 : 0), distinctUntilChanged())
        .subscribe(() => { this.page = 1; this.load(); });
    });
  }

  load() {
    this.api.getPaginated<FeeInvoice>('/fee-invoices',
      { page: this.page, limit: this.pageSize, search: this.searchCtrl.value || undefined },
      {
        status:         this.statusCtrl.value || undefined,
        academicYearId: this.yearCtrl.value   || undefined,
        billingMonth:   this.monthCtrl.value  || undefined,
      },
    ).subscribe(r => {
      this.invoices.set(r.data);
      this.total.set(r.meta.total);
      this.totalOutstanding.set(
        r.data
          .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'waived')
          .reduce((s, i) => s + +i.balanceAmount, 0),
      );
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  isPast(d: string) { return new Date(d) < new Date(); }

  cancelInvoice(inv: FeeInvoice) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancel Invoice',
        message: `Cancel invoice ${inv.invoiceNumber}? This cannot be undone.`,
        confirmLabel: 'Cancel Invoice',
        confirmColor: 'warn',
      },
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) {
        this.api.patch(`/fee-invoices/${inv.id}/cancel`, { reason: 'Cancelled by admin' }).subscribe({
          next: () => { this.snackBar.open('Invoice cancelled', 'OK'); this.load(); },
        });
      }
    });
  }
}
