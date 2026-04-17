import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass } from '../../../core/models';

@Component({
  selector: 'app-fee-structure-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatCheckboxModule,
    MatDividerModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div>
          <h1 class="section-title">{{ isEdit ? 'Edit Fee Structure' : 'New Fee Structure' }}</h1>
          <p class="section-subtitle">Define a fee that can be charged to students</p>
        </div>
        <button mat-stroked-button routerLink="/fee-structures"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">

        <!-- ── Main Form ── -->
        <mat-card>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:14px;margin-top:8px">

              <!-- Fee Name -->
              <mat-form-field>
                <mat-label>Fee Name *</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Monthly Tuition, Library Fee, Admission Fee">
                <mat-error>Fee name is required</mat-error>
                <mat-hint>Give a clear descriptive name — this appears on every invoice line</mat-hint>
              </mat-form-field>

              <div class="form-grid-2">
                <!-- Amount -->
                <mat-form-field>
                  <mat-label>Amount (PKR) *</mat-label>
                  <input matInput type="number" formControlName="amount" min="1">
                  <span matTextPrefix>₨ </span>
                  <mat-error>A valid amount is required</mat-error>
                  <mat-hint>Monthly base rate — billing frequency is set per student at enrollment</mat-hint>
                </mat-form-field>

                <!-- Academic Year -->
                <mat-form-field>
                  <mat-label>Academic Year *</mat-label>
                  <mat-select formControlName="academicYearId" (selectionChange)="onYearChange($event.value)">
                    @for (y of years(); track y.id) {
                      <mat-option [value]="y.id">{{ y.name }}{{ y.isCurrent ? ' (Current)' : '' }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Academic year is required</mat-error>
                </mat-form-field>

                <!-- Class -->
                <mat-form-field>
                  <mat-label>Applies To Class</mat-label>
                  <mat-select formControlName="classId">
                    <mat-option value="">All Classes</mat-option>
                    @for (cls of classes(); track cls.id) {
                      <mat-option [value]="cls.id">{{ cls.name }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>Leave "All Classes" for school-wide fees like tuition</mat-hint>
                </mat-form-field>
              </div>

              <mat-divider />

              <!-- Checkboxes with explanations -->
              <div style="display:flex;flex-direction:column;gap:14px">

                <!-- One-Time -->
                <div class="option-row" [class.option-active]="form.value.isOneTime">
                  <mat-checkbox formControlName="isOneTime" color="primary">
                    <span style="font-weight:600">One-Time Fee</span>
                  </mat-checkbox>
                  <div class="option-desc">
                    <mat-icon>info_outline</mat-icon>
                    <span>
                      Check this for fees charged <strong>once at enrollment only</strong> — e.g. Admission Fee, Registration Fee.
                      It will be combined with the first period fee into a single invoice at the time of enrollment.
                      Leave unchecked for recurring fees (tuition, library, transport) charged every billing period.
                    </span>
                  </div>
                </div>

                <!-- Mandatory -->
                <div class="option-row" [class.option-active]="form.value.isMandatory">
                  <mat-checkbox formControlName="isMandatory" color="primary">
                    <span style="font-weight:600">Mandatory Fee</span>
                  </mat-checkbox>
                  <div class="option-desc">
                    <mat-icon>info_outline</mat-icon>
                    <span>
                      Check this for fees <strong>every student must pay</strong> — e.g. Tuition, Exam Fee, Admission Fee.
                      These are automatically included in every invoice.
                      Leave unchecked for optional services like Library, Transport, Lab — students choose these at enrollment.
                    </span>
                  </div>
                </div>

              </div>

              <mat-divider />

              <!-- Description -->
              <mat-form-field>
                <mat-label>Description (optional)</mat-label>
                <textarea matInput formControlName="description" rows="2"
                  placeholder="e.g. Monthly tuition fee for primary classes, includes all core subjects"></textarea>
              </mat-form-field>

              <div class="flex-end mt-2">
                <button mat-stroked-button type="button" routerLink="/fee-structures">Cancel</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
                  Save Fee Structure
                </button>
              </div>

            </form>
          </mat-card-content>
        </mat-card>

        <!-- ── Help Sidebar ── -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- How billing works -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-icon style="color:#2563eb">help_outline</mat-icon>
                  How Billing Works
                </div>
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;font-size:.82rem;color:#475569">
                <div class="help-item">
                  <mat-icon class="hi">payments</mat-icon>
                  <div><strong>Amount is a monthly base rate.</strong> When a student is enrolled, their chosen billing frequency (monthly, quarterly, etc.) multiplies this amount accordingly. e.g. PKR 8,500/month → PKR 25,500 for quarterly billing.</div>
                </div>
                <div class="help-item">
                  <mat-icon class="hi">event</mat-icon>
                  <div><strong>Due dates and grace periods</strong> are configured globally in Settings, not per fee structure. All invoices use the same due date rule.</div>
                </div>
                <div class="help-item">
                  <mat-icon class="hi">warning_amber</mat-icon>
                  <div><strong>Late fees</strong> are also configured in Settings and applied automatically to all overdue invoices after the grace period.</div>
                </div>
                <div class="help-item">
                  <mat-icon class="hi">school</mat-icon>
                  <div><strong>Class-specific fees</strong> — set "Applies To Class" to restrict a fee to one class (e.g. a lab fee for Class 9 only). Leave it "All Classes" for school-wide fees.</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Examples -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <div style="display:flex;align-items:center;gap:8px">
                  <mat-icon style="color:#16a34a">lightbulb</mat-icon>
                  Examples
                </div>
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
                @for (ex of examples; track ex.name) {
                  <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;font-size:.8rem">
                    <div style="font-weight:700;color:#0f172a;margin-bottom:4px">{{ ex.name }}</div>
                    <div style="color:#64748b;margin-bottom:6px">{{ ex.desc }}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <span class="badge" [class]="ex.mandatory ? 'badge-active' : 'badge-pending'" style="font-size:.7rem">
                        {{ ex.mandatory ? 'Mandatory' : 'Optional' }}
                      </span>
                      @if (ex.oneTime) {
                        <span class="badge badge-issued" style="font-size:.7rem">One-Time</span>
                      } @else {
                        <span class="badge badge-paid" style="font-size:.7rem">Recurring</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .option-row {
      padding: 12px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      transition: border-color .15s, background .15s;
    }
    .option-active {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .option-desc {
      display: flex; align-items: flex-start; gap: 8px;
      margin-top: 8px; font-size: .78rem; color: #64748b; line-height: 1.5;
      mat-icon { font-size: 16px; color: #94a3b8; flex-shrink: 0; margin-top: 1px; }
    }
    .help-item {
      display: flex; align-items: flex-start; gap: 10px; line-height: 1.5;
      .hi { font-size: 18px; color: #2563eb; flex-shrink: 0; margin-top: 1px; }
    }
  `]
})
export class FeeStructureFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  fsId = '';
  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  classes = signal<SchoolClass[]>([]);

  readonly examples = [
    { name: 'Monthly Tuition',    desc: 'Core teaching fee charged every billing period to all students', mandatory: true,  oneTime: false },
    { name: 'Admission Fee',      desc: 'One-time fee paid at enrollment, combined with first period invoice', mandatory: true,  oneTime: true  },
    { name: 'Library Fee',        desc: 'Optional service, student selects at enrollment', mandatory: false, oneTime: false },
    { name: 'Transport Fee',      desc: 'Optional bus/van service chosen at enrollment', mandatory: false, oneTime: false },
    { name: 'Annual Exam Fee',    desc: 'Mandatory fee for all students, charged once per year', mandatory: true,  oneTime: false },
  ];

  form = this.fb.group({
    name:           ['', Validators.required],
    amount:         ['', [Validators.required, Validators.min(1)]],
    academicYearId: ['', Validators.required],
    classId:        [''],
    isMandatory:    [true],
    isOneTime:      [false],
    description:    [''],
  });

  ngOnInit() {
    this.fsId = this.route.snapshot.params['id'];
    this.isEdit = !!this.fsId;

    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur && !this.isEdit) {
        this.form.patchValue({ academicYearId: cur.id });
        this.loadClasses(cur.id);
      }
    });

    if (this.isEdit) {
      this.api.get<any>(`/fee-structures/${this.fsId}`).subscribe(f => {
        this.form.patchValue(f);
        if (f.academicYearId) this.loadClasses(f.academicYearId);
      });
    }
  }

  onYearChange(yearId: string) { this.loadClasses(yearId); }

  loadClasses(yearId: string) {
    this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId })
      .subscribe(r => this.classes.set(r.data));
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      amount: +this.form.value.amount!,
      classId: this.form.value.classId || undefined,
    };
    const req = this.isEdit
      ? this.api.put(`/fee-structures/${this.fsId}`, payload)
      : this.api.post('/fee-structures', payload);
    req.subscribe({
      next: () => { this.snackBar.open('Fee structure saved', 'OK'); this.router.navigate(['/fee-structures']); },
      error: e => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); },
    });
  }
}
