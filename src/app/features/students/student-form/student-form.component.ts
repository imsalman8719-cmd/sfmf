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
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { AcademicYear, SchoolClass, AdmissionStatus } from '../../../core/models';

// Custom Validators
function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value) ? null : { email: 'email must be an email' };
}

function isoDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  // Check if it's a Date object
  if (value instanceof Date) {
    // Valid Date object
    return null;
  }
  
  // Check if it's a string in ISO 8601 format
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof value === 'string' && isoRegex.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return null;
    }
  }
  
  return { dateOfBirth: 'dateOfBirth must be a valid ISO 8601 date string' };
}

function uuidValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? null : { classId: 'classId must be a UUID' };
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatCheckboxModule, MatDividerModule, MatProgressSpinnerModule,
    MatStepperModule, MatTabsModule
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
  statuses = Object.values(AdmissionStatus);

  accountForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, emailValidator]],
    password: [''],
    phone: [''],
    gender: [''],
    dateOfBirth: ['', isoDateValidator],
    address: ['']
  });

  academicForm = this.fb.group({
    academicYearId: ['', Validators.required],
    classId: ['', uuidValidator],
    rollNumber: [''],
    admissionStatus: [AdmissionStatus.ADMITTED],
    admissionDate: [new Date()],
    previousSchool: [''],
    bloodGroup: [''],
    nationality: [''],
    transportRequired: [false],
    hostelRequired: [false],
    hasSiblings: [false]
  });

  guardianForm = this.fb.group({
    fatherName: [''],
    fatherPhone: [''],
    fatherEmail: ['', emailValidator],
    motherName: [''],
    motherPhone: [''],
    emergencyContact: [''],
    notes: ['']
  });

  ngOnInit() {
    this.studentId = this.route.snapshot.params['id'];
    this.isEdit = !!this.studentId;
    
    // Set password validator only for create mode, remove for edit mode
    if (!this.isEdit) {
      this.accountForm.get('password')?.setValidators(Validators.required);
    } else {
      this.accountForm.get('password')?.clearValidators();
    }
    this.accountForm.get('password')?.updateValueAndValidity();

    this.api.get<any>('/academic-years').subscribe(r => {
      const years = Array.isArray(r) ? r : r.data || [];
      this.years.set(years);
      const current = years.find((y: AcademicYear) => y.isCurrent);
      if (current) { 
        this.academicForm.patchValue({ academicYearId: current.id }); 
        this.loadClasses(current.id); 
      }
    });

    if (this.isEdit) {
      this.api.get<any>(`/students/${this.studentId}`).subscribe(s => {
        this.accountForm.patchValue(s.user || {});
        this.academicForm.patchValue(s);
        this.guardianForm.patchValue(s);
        if (s.academicYearId) this.loadClasses(s.academicYearId);
      });
    }
  }

  onYearChange(yearId: string) { 
    this.loadClasses(yearId); 
  }

  loadClasses(yearId: string) {
    this.api.getPaginated<SchoolClass>('/classes', { limit: 100 }, { academicYearId: yearId })
      .subscribe(r => this.classes.set(r.data));
  }

  // Helper method to format dates to ISO string before submission
  private formatDateToISO(date: any): string | null {
    if (!date) return null;
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    return null;
  }

  // Helper method to remove empty values from object
  private removeEmptyValues(obj: any): any {
    const cleanedObj: any = {};
    
    for (const key in obj) {
      const value = obj[key];
      
      // Skip null, undefined, empty string
      if (value === null || value === undefined) {
        continue;
      }
      
      // Skip empty strings
      if (typeof value === 'string' && value.trim() === '') {
        continue;
      }
      
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      
      // Keep false boolean values (they are valid)
      if (typeof value === 'boolean') {
        cleanedObj[key] = value;
        continue;
      }
      
      // Keep numbers (including 0)
      if (typeof value === 'number') {
        cleanedObj[key] = value;
        continue;
      }
      
      // Keep non-empty strings and other values
      cleanedObj[key] = value;
    }
    
    return cleanedObj;
  }

  submit() {
    if (this.accountForm.invalid || this.academicForm.invalid) {
      // Show validation errors
      Object.keys(this.accountForm.controls).forEach(key => {
        const control = this.accountForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      Object.keys(this.academicForm.controls).forEach(key => {
        const control = this.academicForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.snackBar.open('Please fix validation errors', 'Close', { duration: 3000 });
      return;
    }
    
    this.saving.set(true);
    
    // Format dates to ISO 8601 strings
    const formattedAccount = {
      ...this.accountForm.value,
      dateOfBirth: this.formatDateToISO(this.accountForm.value.dateOfBirth)
    };
    
    const formattedAcademic = {
      ...this.academicForm.value,
      admissionDate: this.formatDateToISO(this.academicForm.value.admissionDate)
    };
    
    // Merge all data
    let payload = { 
      ...formattedAccount, 
      ...formattedAcademic, 
      ...this.guardianForm.value 
    };
    
    // Remove password field for edit mode
    if (this.isEdit) {
      delete payload.password;
    }
    
    // Remove empty values from payload
    payload = this.removeEmptyValues(payload);
    
    console.log('Final payload to send:', payload); // Debug log
    
    const req = this.isEdit
      ? this.api.put(`/students/${this.studentId}`, payload)
      : this.api.post('/students', payload);

    req.subscribe({
      next: () => { 
        this.snackBar.open(this.isEdit ? 'Student updated' : 'Student enrolled', 'OK', { duration: 3000 }); 
        this.router.navigate(['/students']); 
      },
      error: (e) => { 
        this.snackBar.open(e.error?.message || e.message || 'Error saving student', 'Close', { duration: 5000 }); 
        this.saving.set(false); 
      }
    });
  }
}