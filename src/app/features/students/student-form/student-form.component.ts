import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass, FeeStructure, FeeFrequency, AdmissionStatus } from '../../../core/models';

function emailValidator(c: AbstractControl): ValidationErrors | null {
  const v = c.value; if (!v) return null;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) ? null : { email: 'Must be a valid email' };
}
function isoDateValidator(c: AbstractControl): ValidationErrors | null {
  const v = c.value; if (!v || v instanceof Date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : { dateOfBirth: 'Invalid date' };
}
function uuidValidator(c: AbstractControl): ValidationErrors | null {
  const v = c.value; if (!v) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? null : { classId: 'Must be a valid UUID' };
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatCheckboxModule, MatDividerModule, MatProgressSpinnerModule,
    MatStepperModule, MatChipsModule, MatTooltipModule,
  ],
  templateUrl: './student-form.component.html',
  styleUrls: ['./student-form.component.scss'],
})
export class StudentFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  isEdit = false;
  studentId = '';
  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  classes = signal<SchoolClass[]>([]);
  availableFeeStructures = signal<FeeStructure[]>([]);
  statuses = Object.values(AdmissionStatus);

  readonly frequencies = [
    { value: FeeFrequency.MONTHLY,     label: 'Monthly',     desc: 'One invoice per month',                    icon: 'event_repeat' },
    { value: FeeFrequency.QUARTERLY,   label: 'Quarterly',   desc: 'One invoice every 3 months (amount ×3)',   icon: 'date_range' },
    { value: FeeFrequency.SEMI_ANNUAL, label: 'Semi-Annual', desc: 'One invoice every 6 months (amount ×6)',   icon: 'calendar_view_month' },
    { value: FeeFrequency.ANNUAL,      label: 'Annual',      desc: 'Single invoice for the full year (×12)',   icon: 'calendar_today' },
  ];

  accountForm = this.fb.group({
    firstName:   ['', Validators.required],
    lastName:    ['', Validators.required],
    email:       ['', [Validators.required, emailValidator]],
    password:    [''],
    phone:       [''],
    gender:      [''],
    dateOfBirth: ['', isoDateValidator],
    address:     [''],
  });

  academicForm = this.fb.group({
    academicYearId:  ['', Validators.required],
    classId:         ['', uuidValidator],
    rollNumber:      [''],
    admissionStatus: [AdmissionStatus.ADMITTED],
    admissionDate:   [new Date()],
    previousSchool:  [''],
    bloodGroup:      [''],
    nationality:     [''],
    transportRequired: [false],
    hostelRequired:    [false],
    hasSiblings:       [false],
  });

  guardianForm = this.fb.group({
    fatherName:       [''],
    fatherPhone:      [''],
    fatherEmail:      ['', emailValidator],
    motherName:       [''],
    motherPhone:      [''],
    emergencyContact: [''],
    notes:            [''],
  });

  feeForm = this.fb.group({
    billingFrequency:        [FeeFrequency.MONTHLY, Validators.required],
    selectedFeeStructureIds: [[] as string[]],
  });

  ngOnInit() {
    this.studentId = this.route.snapshot.params['id'];
    this.isEdit = !!this.studentId;

    if (!this.isEdit) this.accountForm.get('password')?.setValidators(Validators.required);
    this.accountForm.get('password')?.updateValueAndValidity();

    this.api.get<any>('/academic-years').subscribe(r => {
      const years = Array.isArray(r) ? r : r.data || [];
      this.years.set(years);
      const current = years.find((y: AcademicYear) => y.isCurrent);
      if (current) {
        this.academicForm.patchValue({ academicYearId: current.id });
        this.loadClasses(current.id);
        this.loadOptionalFees(current.id);
      }
    });

    if (this.isEdit) {
      this.api.get<any>(`/students/${this.studentId}`).subscribe(s => {
        this.accountForm.patchValue(s.user || {});
        this.academicForm.patchValue(s);
        this.guardianForm.patchValue(s);
        this.feeForm.patchValue({
          billingFrequency: s.billingFrequency || FeeFrequency.MONTHLY,
          selectedFeeStructureIds: s.selectedFeeStructureIds || [],
        });
        if (s.academicYearId) { this.loadClasses(s.academicYearId); this.loadOptionalFees(s.academicYearId); }
      });
    }
  }

  onYearChange(yearId: string) {
    this.loadClasses(yearId);
    this.loadOptionalFees(yearId);
    this.feeForm.patchValue({ selectedFeeStructureIds: [] });
  }

  loadClasses(yearId: string) {
    this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId })
      .subscribe(r => this.classes.set(r.data));
  }

  loadOptionalFees(yearId: string) {
    this.api.getPaginated<FeeStructure>('/fee-structures', { limit: 100 }, { academicYearId: yearId, isActive: 'true', isMandatory: 'false' })
      .subscribe(r => this.availableFeeStructures.set(r.data));
  }

  isFeeSelected(id: string): boolean {
    return (this.feeForm.value.selectedFeeStructureIds || []).includes(id);
  }

  toggleFee(id: string) {
    const current = [...(this.feeForm.value.selectedFeeStructureIds || [])];
    const idx = current.indexOf(id);
    idx >= 0 ? current.splice(idx, 1) : current.push(id);
    this.feeForm.patchValue({ selectedFeeStructureIds: current });
  }

  categoryIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('library'))   return 'menu_book';
    if (n.includes('transport') || n.includes('bus')) return 'directions_bus';
    if (n.includes('lab'))       return 'science';
    if (n.includes('sport'))     return 'sports_soccer';
    if (n.includes('hostel'))    return 'hotel';
    if (n.includes('exam'))      return 'assignment';
    if (n.includes('uniform'))   return 'checkroom';
    return 'attach_money';
  }

  private formatDate(d: any): string | null {
    if (!d) return null;
    if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return null;
  }

  private clean(obj: any): any {
    const out: any = {};
    for (const k in obj) {
      const v = obj[k];
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && !v.trim()) continue;
      if (Array.isArray(v) && !v.length && k !== 'selectedFeeStructureIds') continue;
      out[k] = v;
    }
    return out;
  }

  submit() {
    if (this.accountForm.invalid || this.academicForm.invalid) {
      this.accountForm.markAllAsTouched(); this.academicForm.markAllAsTouched();
      this.snackBar.open('Please fix validation errors', 'Close', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    let payload = this.clean({
      ...this.accountForm.value, ...this.academicForm.value,
      ...this.guardianForm.value, ...this.feeForm.value,
      dateOfBirth:   this.formatDate(this.accountForm.value.dateOfBirth),
      admissionDate: this.formatDate(this.academicForm.value.admissionDate),
    });
    if (this.isEdit) delete payload.password;

    const req = this.isEdit ? this.api.put(`/students/${this.studentId}`, payload) : this.api.post('/students', payload);
    req.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Student updated' : 'Student enrolled — year invoices generated!', 'OK', { duration: 5000 });
        this.router.navigate(['/students']);
      },
      error: e => { this.snackBar.open(e.error?.message || e.message || 'Error', 'Close', { duration: 5000 }); this.saving.set(false); },
    });
  }
}
