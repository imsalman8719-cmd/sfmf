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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { UserRole } from '../../../core/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">{{ isEdit ? 'Edit User' : 'Add New User' }}</h1><p class="section-subtitle">Configure system access and user details</p></div>
        <button mat-stroked-button routerLink="/users"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>
      <mat-card style="max-width:680px">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            <div class="form-grid-2">
              <mat-form-field><mat-label>First Name *</mat-label><input matInput formControlName="firstName"></mat-form-field>
              <mat-form-field><mat-label>Last Name *</mat-label><input matInput formControlName="lastName"></mat-form-field>
              <mat-form-field><mat-label>Email *</mat-label><input matInput type="email" formControlName="email"></mat-form-field>
              @if (!isEdit) { <mat-form-field><mat-label>Password *</mat-label><input matInput type="password" formControlName="password" placeholder="Min 8 characters"></mat-form-field> }
              <mat-form-field>
                <mat-label>Role *</mat-label>
                <mat-select formControlName="role">
                  @for (r of roles; track r.v) { <mat-option [value]="r.v">{{ r.l }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field><mat-label>Phone</mat-label><input matInput formControlName="phone"></mat-form-field>
              <mat-form-field><mat-label>Department</mat-label><input matInput formControlName="department"></mat-form-field>
              <mat-form-field>
                <mat-label>Gender</mat-label>
                <mat-select formControlName="gender">
                  <mat-option value="male">Male</mat-option>
                  <mat-option value="female">Female</mat-option>
                  <mat-option value="other">Other</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <mat-form-field><mat-label>Address</mat-label><textarea matInput formControlName="address" rows="2"></textarea></mat-form-field>
            <div class="flex-end mt-4">
              <button mat-stroked-button type="button" routerLink="/users">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> } {{ isEdit ? 'Save Changes' : 'Create User' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class UserFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  userId = '';
  saving = signal(false);
  roles = [
    { v: UserRole.SUPER_ADMIN, l: 'Super Admin' },
    { v: UserRole.FINANCE, l: 'Finance' },
    { v: UserRole.ADMISSION, l: 'Admission' },
    { v: UserRole.TEACHER, l: 'Teacher' },
  ];

  form = this.fb.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.minLength(8)],
    role: [UserRole.FINANCE, Validators.required],
    phone: [''], department: [''], gender: [''], address: [''],
  });

  ngOnInit() {
    this.userId = this.route.snapshot.params['id'];
    this.isEdit = !!this.userId;
    if (!this.isEdit) this.form.get('password')!.setValidators(Validators.required);
    if (this.isEdit) {
      this.api.get<any>(`/users/${this.userId}`).subscribe(u => this.form.patchValue(u));
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const req = this.isEdit ? this.api.put(`/users/${this.userId}`, this.form.value) : this.api.post('/users', this.form.value);
    req.subscribe({
      next: () => { this.snackBar.open(this.isEdit ? 'User updated' : 'User created', 'OK'); this.router.navigate(['/users']); },
      error: (e) => { this.snackBar.open(e.message || 'Error', 'Close'); this.saving.set(false); }
    });
  }
}
