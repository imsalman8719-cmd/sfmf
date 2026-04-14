import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatDividerModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">System Settings</h1>
          <p class="section-subtitle">Configure invoice automation and school information</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">

          <!-- Invoice Automation -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-icon style="color:#2563eb">auto_awesome</mat-icon>
                  Invoice Automation
                </div>
              </mat-card-title>
              <mat-card-subtitle>Configure when invoices are automatically generated</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="display:flex;flex-direction:column;gap:16px;margin-top:16px">

              <div class="toggle-row">
                <div>
                  <div style="font-weight:600;font-size:.875rem">Auto Invoice Generation</div>
                  <div style="font-size:.75rem;color:#64748b">Automatically generate invoices based on student fee plans</div>
                </div>
                <mat-slide-toggle formControlName="autoInvoiceEnabled" color="primary" />
              </div>

              <mat-divider />

              <mat-form-field>
                <mat-label>Monthly Invoice Day (1–28)</mat-label>
                <input matInput type="number" formControlName="monthlyInvoiceDay" min="1" max="28">
                <mat-hint>Day of month to auto-generate monthly invoices (e.g. 1 = 1st of each month)</mat-hint>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Quarterly Invoice — Days Before Quarter End</mat-label>
                <input matInput type="number" formControlName="quarterlyInvoiceDaysBefore" min="1" max="60">
                <mat-hint>Generate quarterly invoice this many days before quarter end (e.g. 7 = 1 week before)</mat-hint>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Semi-Annual Invoice — Days Before Period End</mat-label>
                <input matInput type="number" formControlName="semiAnnualInvoiceDaysBefore" min="1" max="90">
                <mat-hint>Generate semi-annual invoice this many days before half-year end</mat-hint>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Annual Invoice — Days Before Year End</mat-label>
                <input matInput type="number" formControlName="annualInvoiceDaysBefore" min="1" max="90">
                <mat-hint>Generate annual invoice this many days before academic year ends</mat-hint>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Default Due Days</mat-label>
                <input matInput type="number" formControlName="defaultDueDays" min="1" max="90">
                <mat-hint>Number of days from invoice issue date to due date</mat-hint>
              </mat-form-field>

              <mat-divider />

              <div class="toggle-row">
                <div>
                  <div style="font-weight:600;font-size:.875rem">Auto Mark Overdue</div>
                  <div style="font-size:.75rem;color:#64748b">Automatically mark unpaid invoices as overdue after due date</div>
                </div>
                <mat-slide-toggle formControlName="autoOverdueMarkingEnabled" color="primary" />
              </div>

              <div class="toggle-row">
                <div>
                  <div style="font-weight:600;font-size:.875rem">Payment Reminders</div>
                  <div style="font-size:.75rem;color:#64748b">Send email reminders before due date</div>
                </div>
                <mat-slide-toggle formControlName="autoReminderEnabled" color="primary" />
              </div>

              <mat-form-field>
                <mat-label>Reminder Days Before Due</mat-label>
                <input matInput type="number" formControlName="reminderDaysBeforeDue" min="1" max="30">
                <mat-hint>Send reminder this many days before the invoice is due</mat-hint>
              </mat-form-field>

            </mat-card-content>
          </mat-card>

          <!-- School Info -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-icon style="color:#2563eb">school</mat-icon>
                  School Information
                </div>
              </mat-card-title>
              <mat-card-subtitle>Used on invoice headers and receipts</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="display:flex;flex-direction:column;gap:16px;margin-top:16px">

              <mat-form-field>
                <mat-label>School Name</mat-label>
                <input matInput formControlName="schoolName" placeholder="e.g. The City Grammar School">
              </mat-form-field>

              <mat-form-field>
                <mat-label>School Address</mat-label>
                <textarea matInput formControlName="schoolAddress" rows="2" placeholder="Street, City, Country"></textarea>
              </mat-form-field>

              <mat-form-field>
                <mat-label>School Phone</mat-label>
                <input matInput formControlName="schoolPhone" placeholder="+92 21 1234567">
              </mat-form-field>

              <mat-form-field>
                <mat-label>Currency Symbol</mat-label>
                <input matInput formControlName="currencySymbol" placeholder="PKR">
                <mat-hint>Used throughout the application (e.g. PKR, USD, GBP)</mat-hint>
              </mat-form-field>

            </mat-card-content>
          </mat-card>

        </div>

        <div class="flex-end mt-6">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
            Save Settings
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .toggle-row {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: 4px 0;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);

  form = this.fb.group({
    monthlyInvoiceDay: [1, [Validators.required, Validators.min(1), Validators.max(28)]],
    quarterlyInvoiceDaysBefore: [7, [Validators.required, Validators.min(1)]],
    semiAnnualInvoiceDaysBefore: [14, [Validators.required, Validators.min(1)]],
    annualInvoiceDaysBefore: [30, [Validators.required, Validators.min(1)]],
    defaultDueDays: [10, [Validators.required, Validators.min(1)]],
    autoInvoiceEnabled: [true],
    autoOverdueMarkingEnabled: [true],
    autoReminderEnabled: [true],
    reminderDaysBeforeDue: [3, [Validators.required, Validators.min(1)]],
    schoolName: [''],
    schoolAddress: [''],
    schoolPhone: [''],
    currencySymbol: ['PKR'],
  });

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(s => {
      if (s) this.form.patchValue(s);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.patch<any>('/settings', this.form.value).subscribe({
      next: () => { this.snackBar.open('Settings saved!', 'OK'); this.saving.set(false); },
      error: e => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
