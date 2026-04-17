import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
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
    MatIconModule, MatSlideToggleModule, MatSelectModule,
    MatDividerModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">System Settings</h1>
          <p class="section-subtitle">Configure due dates, late fees, and school information</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start">

          <!-- ── Left: Configuration ── -->
          <div style="display:flex;flex-direction:column;gap:16px">

            <!-- Due Date & Grace Period -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#2563eb">event</mat-icon> Due Date & Grace Period
                  </div>
                </mat-card-title>
                <mat-card-subtitle>Controls when invoices become due and when late fees kick in</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content style="display:flex;flex-direction:column;gap:16px;margin-top:16px">

                <mat-form-field>
                  <mat-label>Invoice Due Days</mat-label>
                  <input matInput type="number" formControlName="defaultDueDays" min="1" max="90">
                  <span matTextSuffix>days</span>
                  <mat-hint>
                    How many days after the invoice is issued before payment is due.
                    e.g. <strong>10</strong> = invoice raised on 1st April → due 10th April.
                  </mat-hint>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Grace Period</mat-label>
                  <input matInput type="number" formControlName="gracePeriodDays" min="0" max="30">
                  <span matTextSuffix>days after due date</span>
                  <mat-hint>
                    Extra days after the due date before a late fee is applied.
                    e.g. <strong>7</strong> = no late fee for 7 days after due date.
                    Set to <strong>0</strong> to apply late fee immediately on the due date.
                  </mat-hint>
                </mat-form-field>

                <div class="toggle-row">
                  <div>
                    <div style="font-weight:600;font-size:.875rem">Auto-mark Overdue</div>
                    <div style="font-size:.75rem;color:#64748b">
                      Every night the system checks all unpaid invoices. Any invoice past its due date
                      is automatically changed to "Overdue" status so you can see at a glance who hasn't paid.
                    </div>
                  </div>
                  <mat-slide-toggle formControlName="autoOverdueMarkingEnabled" color="primary" />
                </div>

              </mat-card-content>
            </mat-card>

            <!-- Late Fee -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#dc2626">warning_amber</mat-icon> Late Fee
                  </div>
                </mat-card-title>
                <mat-card-subtitle>Automatically charged when a student misses the grace period</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content style="display:flex;flex-direction:column;gap:16px;margin-top:16px">

                <div class="toggle-row">
                  <div>
                    <div style="font-weight:600;font-size:.875rem">Enable Late Fees</div>
                    <div style="font-size:.75rem;color:#64748b">
                      When enabled, the system adds a late fee to every overdue invoice that has
                      passed the grace period. The fee is added <strong>once per invoice</strong>
                      — it does not compound daily.
                    </div>
                  </div>
                  <mat-slide-toggle formControlName="lateFeeEnabled" color="warn" />
                </div>

                @if (form.value.lateFeeEnabled) {
                  <mat-divider />
                  <div class="form-grid-2">
                    <mat-form-field>
                      <mat-label>Late Fee Type</mat-label>
                      <mat-select formControlName="lateFeeType">
                        <mat-option value="percentage">Percentage of balance (%)</mat-option>
                        <mat-option value="fixed">Fixed amount (PKR)</mat-option>
                      </mat-select>
                      <mat-hint>
                        @if (form.value.lateFeeType === 'percentage') {
                          Calculated as % of the remaining unpaid balance
                        } @else {
                          A flat PKR amount added once regardless of balance
                        }
                      </mat-hint>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>
                        {{ form.value.lateFeeType === 'percentage' ? 'Percentage' : 'Amount (PKR)' }}
                      </mat-label>
                      <input matInput type="number" formControlName="lateFeeValue" min="0">
                      <span matTextSuffix>
                        {{ form.value.lateFeeType === 'percentage' ? '%' : 'PKR' }}
                      </span>
                      <mat-hint>
                        @if (form.value.lateFeeType === 'percentage') {
                          e.g. 2 = 2% of PKR 10,000 balance → PKR 200 late fee
                        } @else {
                          e.g. 500 = PKR 500 flat late fee added to the invoice
                        }
                      </mat-hint>
                    </mat-form-field>
                  </div>

                  <!-- Live example calculation -->
                  <div class="example-calc">
                    <mat-icon style="font-size:16px;color:#2563eb;flex-shrink:0">calculate</mat-icon>
                    <span style="font-size:.8rem;color:#1e40af">
                      <strong>Example:</strong>
                      @if (form.value.lateFeeType === 'percentage') {
                        Student has PKR 10,000 outstanding → late fee =
                        PKR {{ (10000 * (form.value.lateFeeValue || 0) / 100) | number:'1.0-0' }}
                      } @else {
                        Student has any outstanding balance → late fee = PKR {{ form.value.lateFeeValue | number:'1.0-0' }}
                      }
                    </span>
                  </div>
                }

              </mat-card-content>
            </mat-card>

            <!-- Reminders -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#f59e0b">notifications</mat-icon> Payment Reminders
                  </div>
                </mat-card-title>
                <mat-card-subtitle>Automated reminders sent before invoices become due</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content style="margin-top:16px">
                <mat-form-field>
                  <mat-label>Reminder Days Before Due</mat-label>
                  <input matInput type="number" formControlName="reminderDaysBeforeDue" min="0" max="30">
                  <span matTextSuffix>days</span>
                  <mat-hint>
                    Send a payment reminder this many days before the due date.
                    e.g. <strong>3</strong> = reminder sent 3 days before due date.
                    Set to <strong>0</strong> to disable reminders.
                  </mat-hint>
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <!-- School Information -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#7c3aed">school</mat-icon> School Information
                  </div>
                </mat-card-title>
                <mat-card-subtitle>Appears on invoice headers, receipts, and notifications</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content style="display:flex;flex-direction:column;gap:14px;margin-top:16px">
                <mat-form-field>
                  <mat-label>School Name</mat-label>
                  <input matInput formControlName="schoolName" placeholder="e.g. The City Grammar School">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Address</mat-label>
                  <textarea matInput formControlName="schoolAddress" rows="2" placeholder="Street, City, Country"></textarea>
                </mat-form-field>
                <div class="form-grid-2">
                  <mat-form-field>
                    <mat-label>Phone</mat-label>
                    <input matInput formControlName="schoolPhone" placeholder="+92 21 1234567">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Currency Symbol</mat-label>
                    <input matInput formControlName="currencySymbol" placeholder="PKR">
                    <mat-hint>Shown throughout the app (PKR, USD, GBP…)</mat-hint>
                  </mat-form-field>
                </div>
              </mat-card-content>
            </mat-card>

          </div>

          <!-- ── Right: Help Panel ── -->
          <div style="display:flex;flex-direction:column;gap:16px">

            <!-- Timeline diagram -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#2563eb">timeline</mat-icon> Payment Timeline
                  </div>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div style="display:flex;flex-direction:column;gap:0;margin-top:12px">
                  @for (step of timeline; track step.day) {
                    <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-left:2px solid #e2e8f0;margin-left:8px;padding-left:16px;position:relative">
                      <div style="width:12px;height:12px;border-radius:50%;background:{{ step.color }};position:absolute;left:-7px;top:12px;flex-shrink:0"></div>
                      <div>
                        <div style="font-size:.8rem;font-weight:700;color:#0f172a">Day {{ step.day }}: {{ step.title }}</div>
                        <div style="font-size:.75rem;color:#64748b;margin-top:2px">{{ step.desc }}</div>
                      </div>
                    </div>
                  }
                </div>
                <p style="font-size:.72rem;color:#94a3b8;margin-top:12px">
                  Based on defaults: Due Days = 10, Grace Period = 7
                </p>
              </mat-card-content>
            </mat-card>

            <!-- Quick FAQ -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="color:#16a34a">quiz</mat-icon> FAQ
                  </div>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px">
                  @for (q of faqs; track q.q) {
                    <div style="font-size:.8rem">
                      <div style="font-weight:700;color:#0f172a;margin-bottom:3px">{{ q.q }}</div>
                      <div style="color:#64748b;line-height:1.5">{{ q.a }}</div>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>

          </div>
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
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 4px 0;
    }
    .example-calc {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px;
      background: #eff6ff; border-radius: 8px;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saving = signal(false);

  readonly timeline = [
    { day: 0,  title: 'Invoice Issued',   color: '#2563eb', desc: 'Invoice created and sent to student/parent' },
    { day: 10, title: 'Due Date',         color: '#f59e0b', desc: 'Payment expected by this date (Due Days = 10)' },
    { day: 17, title: 'Grace Period Ends',color: '#ea580c', desc: 'Last chance to pay without late fee (Grace = 7 days)' },
    { day: 17, title: 'Late Fee Applied', color: '#dc2626', desc: 'Late fee added to invoice balance automatically' },
  ];

  readonly faqs = [
    { q: 'When does a student become a "Defaulter"?',
      a: 'A student appears in the Defaulters report as soon as any of their invoices have an unpaid balance, regardless of whether it\'s overdue yet.' },
    { q: 'Can I waive a late fee?',
      a: 'Yes — go to the invoice, apply a Waiver. Finance can approve waivers for individual students.' },
    { q: 'Does the late fee compound daily?',
      a: 'No. The late fee is applied once per invoice after the grace period ends. It does not grow each day.' },
    { q: 'What if I change settings after invoices are already issued?',
      a: 'Changes only affect invoices going forward. Existing invoices keep their current due dates and late fee amounts.' },
  ];

  form = this.fb.group({
    defaultDueDays:             [10, [Validators.required, Validators.min(1)]],
    gracePeriodDays:            [7,  [Validators.required, Validators.min(0)]],
    autoOverdueMarkingEnabled:  [true],
    lateFeeEnabled:             [true],
    lateFeeType:                ['percentage'],
    lateFeeValue:               [2,  [Validators.required, Validators.min(0)]],
    reminderDaysBeforeDue:      [3],
    schoolName:                 [''],
    schoolAddress:              [''],
    schoolPhone:                [''],
    currencySymbol:             ['PKR'],
  });

  ngOnInit() {
    this.api.get<any>('/settings').subscribe({
      next: s => { if (s) this.form.patchValue(s); },
      error: () => {},
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.patch<any>('/settings', this.form.value).subscribe({
      next: () => { this.snackBar.open('Settings saved!', 'OK', { duration: 4000 }); this.saving.set(false); },
      error: e => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); },
    });
  }
}
