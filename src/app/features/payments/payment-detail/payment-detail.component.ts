import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { Payment } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      @if (payment()) {
        <div class="flex-between mb-6 no-print">
          <div>
            <h1 class="section-title">Payment Receipt</h1>
            <p class="text-mono" style="color:#64748b">{{ payment()!.receiptNumber }}</p>
          </div>
          <div class="flex-gap">
            <button mat-stroked-button onclick="window.print()"><mat-icon>print</mat-icon> Print Receipt</button>
            <a mat-stroked-button routerLink="/payments"><mat-icon>arrow_back</mat-icon> Back</a>
          </div>
        </div>

        <mat-card style="max-width:560px">
          <mat-card-content>
            <div style="text-align:center;padding:20px 0;border-bottom:2px dashed #e2e8f0;margin-bottom:20px">
              <div style="font-size:1.75rem;font-weight:800;color:#2563eb;letter-spacing:.05em">PAYMENT RECEIPT</div>
              <div class="text-mono" style="color:#64748b;margin-top:4px">{{ payment()!.receiptNumber }}</div>
              <span class="badge" [class]="'badge-' + payment()!.status" style="margin-top:8px">{{ payment()!.status | statusLabel }}</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;font-size:.875rem">
              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Student Name</span>
                <strong>{{ payment()!.student?.user?.firstName }} {{ payment()!.student?.user?.lastName }}</strong>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Registration No.</span>
                <span class="text-mono">{{ payment()!.student?.registrationNumber }}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Class</span>
                <span>{{ payment()!.student?.class?.name || '—' }}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Invoice</span>
                <a [routerLink]="['/invoices', payment()!.invoiceId]" style="color:#2563eb;text-decoration:none" class="text-mono">{{ payment()!.invoice?.invoiceNumber }}</a>
              </div>

              <mat-divider />

              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Payment Date</span>
                <span>{{ payment()!.paymentDate | date:'fullDate' }}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span class="text-muted">Payment Method</span>
                <span style="text-transform:capitalize">{{ payment()!.method | statusLabel }}</span>
              </div>
              @if (payment()!.bankName) {
                <div style="display:flex;justify-content:space-between"><span class="text-muted">Bank</span><span>{{ payment()!.bankName }}</span></div>
              }
              @if (payment()!.chequeNumber) {
                <div style="display:flex;justify-content:space-between"><span class="text-muted">Cheque No.</span><span class="text-mono">{{ payment()!.chequeNumber }}</span></div>
              }
              @if (payment()!.transactionId) {
                <div style="display:flex;justify-content:space-between"><span class="text-muted">Transaction ID</span><span class="text-mono">{{ payment()!.transactionId }}</span></div>
              }
              @if (payment()!.remarks) {
                <div style="display:flex;justify-content:space-between"><span class="text-muted">Remarks</span><span>{{ payment()!.remarks }}</span></div>
              }

              <mat-divider />

              <div style="display:flex;justify-content:space-between;font-size:1.5rem;font-weight:800;color:#16a34a;padding:8px 0">
                <span>Amount Paid</span>
                <span>{{ payment()!.amount | currency:'PKR ':'symbol':'1.0-0' }}</span>
              </div>

              @if (payment()!.isRefunded) {
                <div style="background:#fee2e2;padding:10px 14px;border-radius:8px;color:#b91c1c;font-size:.8rem">
                  ⚠ This payment was refunded: {{ payment()!.refundedAmount | currency:'PKR ':'symbol':'1.0-0' }}
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`@media print { .no-print { display: none !important; } }`]
})
export class PaymentDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  payment = signal<Payment | null>(null);

  ngOnInit() {
    this.api.get<Payment>(`/payments/${this.route.snapshot.params['id']}`).subscribe(p => this.payment.set(p));
  }
}
