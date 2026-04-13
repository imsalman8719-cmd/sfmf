import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Payment, PaymentMethod, UserRole } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatMenuModule, MatTooltipModule, MatDatepickerModule, MatNativeDateModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">Payments</h1>
          <p class="section-subtitle">{{ total() | number }} payments · Total: {{ totalAmount() | currency:'PKR ':'symbol':'1.0-0' }}</p>
        </div>
        @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.FINANCE)) {
          <button mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> Record Payment</button>
        }
      </div>

      <div class="table-container">
        <div class="table-filters">
          <mat-form-field><mat-label>Search</mat-label><input matInput [formControl]="searchCtrl" placeholder="Receipt #, student name…"><mat-icon matSuffix>search</mat-icon></mat-form-field>
          <mat-form-field style="min-width:160px">
            <mat-label>Method</mat-label>
            <mat-select [formControl]="methodCtrl">
              <mat-option value="">All Methods</mat-option>
              @for (m of methods; track m) { <mat-option [value]="m">{{ m | statusLabel }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>From Date</mat-label>
            <input matInput [matDatepicker]="fp" [formControl]="fromCtrl">
            <mat-datepicker-toggle matIconSuffix [for]="fp" /><mat-datepicker #fp />
          </mat-form-field>
          <mat-form-field>
            <mat-label>To Date</mat-label>
            <input matInput [matDatepicker]="tp" [formControl]="toCtrl">
            <mat-datepicker-toggle matIconSuffix [for]="tp" /><mat-datepicker #tp />
          </mat-form-field>
        </div>

        <table mat-table [dataSource]="payments()">
          <ng-container matColumnDef="receipt"><th mat-header-cell *matHeaderCellDef>Receipt #</th><td mat-cell *matCellDef="let p"><a [routerLink]="[p.id]" class="inv-link text-mono">{{ p.receiptNumber }}</a></td></ng-container>
          <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let p">
              <div style="font-weight:600;font-size:.875rem">{{ p.student?.user?.firstName }} {{ p.student?.user?.lastName }}</div>
              <div style="font-size:.75rem;color:#64748b">{{ p.student?.class?.name }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice</th><td mat-cell *matCellDef="let p"><a [routerLink]="['/invoices', p.invoiceId]" class="inv-link text-mono">{{ p.invoice?.invoiceNumber }}</a></td></ng-container>
          <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let p">{{ p.paymentDate | date:'mediumDate' }}</td></ng-container>
          <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let p" style="font-weight:700;color:#16a34a">{{ p.amount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
          <ng-container matColumnDef="method"><th mat-header-cell *matHeaderCellDef>Method</th><td mat-cell *matCellDef="let p"><span class="badge badge-issued" style="text-transform:capitalize">{{ p.method | statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let p"><span class="badge" [class]="'badge-' + p.status">{{ p.status | statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <a mat-icon-button [routerLink]="[p.id]" matTooltip="View"><mat-icon>visibility</mat-icon></a>
              @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.FINANCE) && !p.isRefunded && p.status === 'completed') {
                <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #menu>
                  <button mat-menu-item (click)="verify(p)" [disabled]="!!p.verifiedBy"><mat-icon>verified</mat-icon> Verify</button>
                  <button mat-menu-item (click)="refund(p)"><mat-icon color="warn">undo</mat-icon> Refund</button>
                </mat-menu>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        <mat-paginator [length]="total()" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons />
      </div>
    </div>
  `,
  styles: [`.inv-link{color:#2563eb;text-decoration:none;font-weight:600;&:hover{text-decoration:underline}}`]
})
export class PaymentsListComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  UserRole = UserRole;
  columns = ['receipt','student','invoice','date','amount','method','status','actions'];
  methods = Object.values(PaymentMethod);
  payments = signal<Payment[]>([]);
  total = signal(0);
  totalAmount = signal(0);
  page = 1; pageSize = 20;
  searchCtrl = new FormControl('');
  methodCtrl = new FormControl('');
  fromCtrl = new FormControl('');
  toCtrl = new FormControl('');

  ngOnInit() {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { this.page = 1; this.load(); });
    [this.methodCtrl, this.fromCtrl, this.toCtrl].forEach(c => c.valueChanges.subscribe(() => { this.page = 1; this.load(); }));
  }

  load() {
    this.api.getPaginated<Payment>('/payments', { page: this.page, limit: this.pageSize, search: this.searchCtrl.value || undefined }, {
      method: this.methodCtrl.value || undefined,
      fromDate: this.fromCtrl.value ? new Date(this.fromCtrl.value as any).toISOString().split('T')[0] : undefined,
      toDate: this.toCtrl.value ? new Date(this.toCtrl.value as any).toISOString().split('T')[0] : undefined,
    }).subscribe(r => {
      this.payments.set(r.data);
      this.total.set(r.meta.total);
      this.totalAmount.set(r.data.reduce((s, p) => s + +p.amount, 0));
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }
  verify(p: Payment) { this.api.patch(`/payments/${p.id}/verify`).subscribe({ next: () => { this.snackBar.open('Payment verified', 'OK'); this.load(); } }); }
  refund(p: Payment) { this.api.patch(`/payments/${p.id}/refund`, { refundedAmount: p.amount, refundReason: 'Refund requested' }).subscribe({ next: () => { this.snackBar.open('Refunded', 'OK'); this.load(); } }); }
}
