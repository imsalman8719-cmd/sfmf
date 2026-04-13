import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { FeeInvoice, PaymentMethod } from '../../../core/models';

@Component({
  selector: 'app-record-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Record Payment</h1><p class="section-subtitle">Enter payment details against a fee invoice</p></div>
        <button mat-stroked-button routerLink="/payments"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start">
        <mat-card>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
              <mat-form-field>
                <mat-label>Invoice Number *</mat-label>
                <input matInput formControlName="invoiceSearch" placeholder="INV-202501-XXXXX" (blur)="lookupInvoice()">
                <mat-icon matSuffix>search</mat-icon>
                <mat-hint>Enter invoice number or ID and press Tab to lookup</mat-hint>
              </mat-form-field>

              @if (invoice()) {
                <div class="inv-summary">
                  <div class="inv-row"><span>Student</span><strong>{{ invoice()!.student?.user?.firstName }} {{ invoice()!.student?.user?.lastName }}</strong></div>
                  <div class="inv-row"><span>Invoice</span><strong class="text-mono">{{ invoice()!.invoiceNumber }}</strong></div>
                  <div class="inv-row"><span>Total Amount</span><strong>{{ invoice()!.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                  <div class="inv-row"><span>Already Paid</span><strong style="color:#16a34a">{{ invoice()!.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                  <div class="inv-row"><span>Balance Due</span><strong style="color:#dc2626;font-size:1.1rem">{{ invoice()!.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</strong></div>
                </div>
              }

              <mat-divider />
              <h3 style="font-weight:600;color:#475569;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em">Payment Details</h3>

              <div class="form-grid-2">
                <mat-form-field>
                  <mat-label>Amount *</mat-label>
                  <input matInput type="number" formControlName="amount" [max]="invoice()?.balanceAmount || 999999">
                  <span matTextPrefix>PKR &nbsp;</span>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Payment Method *</mat-label>
                  <mat-select formControlName="method" (selectionChange)="onMethodChange()">
                    @for (m of methods; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Payment Date *</mat-label>
                  <input matInput [matDatepicker]="pd" formControlName="paymentDate">
                  <mat-datepicker-toggle matIconSuffix [for]="pd" /><mat-datepicker #pd />
                </mat-form-field>
                @if (showBank()) {
                  <mat-form-field><mat-label>Bank Name</mat-label><input matInput formControlName="bankName"></mat-form-field>
                }
                @if (showCheque()) {
                  <mat-form-field><mat-label>Cheque Number</mat-label><input matInput formControlName="chequeNumber"></mat-form-field>
                  <mat-form-field>
                    <mat-label>Cheque Date</mat-label>
                    <input matInput [matDatepicker]="cd" formControlName="chequeDate">
                    <mat-datepicker-toggle matIconSuffix [for]="cd" /><mat-datepicker #cd />
                  </mat-form-field>
                }
                @if (showTxn()) {
                  <mat-form-field><mat-label>Transaction ID</mat-label><input matInput formControlName="transactionId"></mat-form-field>
                }
              </div>
              <mat-form-field><mat-label>Remarks</mat-label><textarea matInput formControlName="remarks" rows="2"></textarea></mat-form-field>

              <div class="flex-end mt-4">
                <button mat-stroked-button type="button" routerLink="/payments">Cancel</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving() || !invoice()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>payments</mat-icon> } Record Payment
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Quick Tips</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="tip-list">
              <div class="tip"><mat-icon>info</mat-icon><span>Payment amount cannot exceed outstanding balance</span></div>
              <div class="tip"><mat-icon>receipt</mat-icon><span>A receipt will be auto-generated and emailed</span></div>
              <div class="tip"><mat-icon>check_circle</mat-icon><span>Invoice status updates automatically on payment</span></div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .inv-summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px}
    .inv-row{display:flex;justify-content:space-between;font-size:.875rem;span{color:#64748b}}
    .tip-list{display:flex;flex-direction:column;gap:12px;margin-top:8px}
    .tip{display:flex;align-items:flex-start;gap:10px;font-size:.8rem;color:#475569;mat-icon{font-size:18px;color:#2563eb;flex-shrink:0;margin-top:1px}}
  `]
})
export class RecordPaymentComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);
  invoice = signal<FeeInvoice | null>(null);
  methods = [
    { v: PaymentMethod.CASH, l: 'Cash' },
    { v: PaymentMethod.BANK_TRANSFER, l: 'Bank Transfer' },
    { v: PaymentMethod.CHEQUE, l: 'Cheque' },
    { v: PaymentMethod.ONLINE, l: 'Online' },
    { v: PaymentMethod.POS, l: 'POS / Card' },
  ];

  showBank() { const m = this.form.get('method')?.value; return m === PaymentMethod.BANK_TRANSFER; }
  showCheque() { return this.form.get('method')?.value === PaymentMethod.CHEQUE; }
  showTxn() { const m = this.form.get('method')?.value; return m === PaymentMethod.ONLINE || m === PaymentMethod.POS; }

  form = this.fb.group({
    invoiceSearch: [''],
    invoiceId: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(1)]],
    method: [PaymentMethod.CASH, Validators.required],
    paymentDate: [new Date(), Validators.required],
    bankName: [''], chequeNumber: [''], chequeDate: [''],
    transactionId: [''], remarks: [''],
  });

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['invoiceId']) {
      this.form.patchValue({ invoiceId: qp['invoiceId'], invoiceSearch: qp['invoiceId'] });
      this.loadInvoice(qp['invoiceId']);
    }
  }

  lookupInvoice() {
    const val = this.form.get('invoiceSearch')?.value?.trim();
    if (!val) return;
    this.api.get<FeeInvoice>(`/fee-invoices/${val}`).subscribe({
      next: inv => { this.invoice.set(inv); this.form.patchValue({ invoiceId: inv.id, amount: inv.balanceAmount as any }); },
      error: () => this.api.get<FeeInvoice>(`/fee-invoices/number/${val}`).subscribe({ next: inv => { this.invoice.set(inv); this.form.patchValue({ invoiceId: inv.id, amount: inv.balanceAmount as any }); }, error: () => this.snackBar.open('Invoice not found', 'Close') })
    });
  }

  loadInvoice(id: string) {
    this.api.get<FeeInvoice>(`/fee-invoices/${id}`).subscribe(inv => {
      this.invoice.set(inv);
      this.form.patchValue({ invoiceId: inv.id, invoiceSearch: inv.invoiceNumber, amount: inv.balanceAmount as any });
    });
  }

  onMethodChange() {}

  submit() {
    if (this.form.invalid || !this.invoice()) return;
    this.saving.set(true);
    const v = this.form.value;
    const payload = {
      invoiceId: v.invoiceId,
      amount: +v.amount!,
      method: v.method,
      paymentDate: new Date(v.paymentDate as any).toISOString().split('T')[0],
      bankName: v.bankName || undefined,
      chequeNumber: v.chequeNumber || undefined,
      chequeDate: v.chequeDate ? new Date(v.chequeDate as any).toISOString().split('T')[0] : undefined,
      transactionId: v.transactionId || undefined,
      remarks: v.remarks || undefined,
    };
    this.api.post('/payments', payload).subscribe({
      next: (p: any) => { this.snackBar.open(`Payment recorded! Receipt: ${p.receiptNumber}`, 'OK', { duration: 6000 }); this.router.navigate(['/payments', p.id]); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
