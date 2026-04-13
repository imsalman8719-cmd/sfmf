import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { FeeInvoice } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDividerModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      @if (invoice()) {
        <div class="flex-between mb-6">
          <div>
            <h1 class="section-title text-mono">{{ invoice()!.invoiceNumber }}</h1>
            <span class="badge" [class]="'badge-' + invoice()!.status" style="margin-top:4px">{{ invoice()!.status | statusLabel }}</span>
          </div>
          <div class="flex-gap">
            <a mat-stroked-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</a>
            @if (invoice()!.status !== 'paid' && invoice()!.status !== 'cancelled') {
              <a mat-flat-button color="primary" [routerLink]="['/payments/new']" [queryParams]="{invoiceId: invoice()!.id}">
                <mat-icon>payments</mat-icon> Record Payment
              </a>
            }
          </div>
        </div>

        <div class="form-grid-2 mb-6">
          <mat-card>
            <mat-card-header><mat-card-title>Student</mat-card-title></mat-card-header>
            <mat-card-content>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;font-size:.875rem">
                <div><strong>{{ invoice()!.student?.user?.firstName }} {{ invoice()!.student?.user?.lastName }}</strong></div>
                <div class="text-muted">{{ invoice()!.student?.registrationNumber }}</div>
                <div class="text-muted">{{ invoice()!.student?.class?.name }}</div>
                <a [routerLink]="['/students', invoice()!.studentId]" style="color:#2563eb;font-size:.8rem;text-decoration:none">View Profile →</a>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-header><mat-card-title>Invoice Summary</mat-card-title></mat-card-header>
            <mat-card-content>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                <div style="display:flex;justify-content:space-between;font-size:.875rem"><span class="text-muted">Period</span><span>{{ invoice()!.billingLabel || '—' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.875rem"><span class="text-muted">Issue Date</span><span>{{ invoice()!.issueDate | date:'mediumDate' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.875rem"><span class="text-muted">Due Date</span>
                  <span [style.color]="isPast(invoice()!.dueDate) ? '#dc2626' : '#0f172a'" style="font-weight:500">{{ invoice()!.dueDate | date:'mediumDate' }}</span>
                </div>
                <mat-divider />
                <div style="display:flex;justify-content:space-between;font-size:.875rem"><span class="text-muted">Subtotal</span><span>{{ invoice()!.subtotal | currency:'PKR ':'symbol':'1.0-0' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.875rem;color:#16a34a"><span>Discount</span><span>- {{ invoice()!.discountAmount | currency:'PKR ':'symbol':'1.0-0' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.875rem;color:#dc2626"><span>Late Fee</span><span>+ {{ invoice()!.lateFeeAmount | currency:'PKR ':'symbol':'1.0-0' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;border-top:2px solid #e2e8f0;padding-top:8px"><span>Total</span><span>{{ invoice()!.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.875rem;color:#16a34a"><span>Paid</span><span>{{ invoice()!.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem" [style.color]="invoice()!.balanceAmount > 0 ? '#dc2626' : '#16a34a'">
                  <span>Balance Due</span><span>{{ invoice()!.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card>
          <mat-card-header><mat-card-title>Line Items</mat-card-title></mat-card-header>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="invoice()!.lineItems">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Fee Item</th><td mat-cell *matCellDef="let li"><strong>{{ li.feeName }}</strong></td></ng-container>
              <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let li" style="text-transform:capitalize">{{ li.category }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let li">{{ li.amount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="discount"><th mat-header-cell *matHeaderCellDef>Discount</th><td mat-cell *matCellDef="let li" style="color:#16a34a">{{ li.discountAmount > 0 ? '- ' + (li.discountAmount | currency:'PKR ':'symbol':'1.0-0') : '—' }}</td></ng-container>
              <ng-container matColumnDef="net"><th mat-header-cell *matHeaderCellDef>Net Amount</th><td mat-cell *matCellDef="let li" style="font-weight:700">{{ li.netAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="lineCols"></tr>
              <tr mat-row *matRowDef="let row; columns: lineCols;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `
})
export class InvoiceDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  invoice = signal<FeeInvoice | null>(null);
  lineCols = ['name', 'category', 'amount', 'discount', 'net'];

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.api.get<FeeInvoice>(`/fee-invoices/${id}`).subscribe(inv => this.invoice.set(inv));
  }

  isPast(d: string) { return new Date(d) < new Date(); }
}
