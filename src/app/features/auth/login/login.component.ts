import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="login-brand">
          <div class="brand-icon"><mat-icon>school</mat-icon></div>
          <h1>EduFees</h1>
          <p>School Fee Management System</p>
        </div>
        <div class="features-list">
          @for (f of features; track f.icon) {
            <div class="feature-item">
              <div class="feature-icon"><mat-icon>{{ f.icon }}</mat-icon></div>
              <div>
                <strong>{{ f.title }}</strong>
                <span>{{ f.desc }}</span>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="login-right">
        <mat-card class="login-card">
          <mat-card-header>
            <mat-card-title>Welcome Back</mat-card-title>
            <mat-card-subtitle>Sign in to your account</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="login()">
              <mat-form-field>
                <mat-label>Email Address</mat-label>
                <input matInput type="email" formControlName="email" placeholder="admin@school.edu" autocomplete="email">
                <mat-icon matSuffix>email</mat-icon>
                @if (form.get('email')?.errors?.['required'] && form.get('email')?.touched) {
                  <mat-error>Email is required</mat-error>
                }
                @if (form.get('email')?.errors?.['email']) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

              <mat-form-field>
                <mat-label>Password</mat-label>
                <input matInput [type]="showPwd() ? 'text' : 'password'" formControlName="password" autocomplete="current-password">
                <button mat-icon-button matSuffix type="button" (click)="togglePassword()">
                  <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.get('password')?.errors?.['required'] && form.get('password')?.touched) {
                  <mat-error>Password is required</mat-error>
                }
              </mat-form-field>

              @if (error()) {
                <div class="error-msg">
                  <mat-icon>error_outline</mat-icon>
                  <span>{{ error() }}</span>
                </div>
              }

              <button mat-flat-button color="primary" type="submit"
                [disabled]="form.invalid || loading()" class="login-btn">
                @if (loading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  <ng-container>
                    <mat-icon>login</mat-icon> Sign In
                  </ng-container>
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>
        <p class="login-footer">© 2025 School Fee Management System</p>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex; height: 100vh;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .login-left {
      flex: 1; background: #0f172a;
      display: flex; flex-direction: column;
      justify-content: center; padding: 60px;
    }
    @media (max-width: 900px) {
      .login-left { display: none; }
    }
    .login-brand {
      margin-bottom: 48px;
    }
    .brand-icon { 
      width: 56px; height: 56px; background: #2563eb; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    .brand-icon mat-icon { color: #fff; font-size: 28px; }
    .login-brand h1 { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .login-brand p { font-size: 1rem; color: #64748b; }
    .feature-item {
      display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px;
    }
    .feature-icon { 
      width: 40px; height: 40px; background: rgba(37,99,235,.2); border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .feature-icon mat-icon { color: #60a5fa; font-size: 20px; }
    .feature-item strong { display: block; font-size: 0.9rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
    .feature-item span { font-size: 0.8rem; color: #64748b; }
    .login-right {
      width: 480px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 40px;
      background: #f8fafc;
    }
    @media (max-width: 900px) {
      .login-right { width: 100%; }
    }
    .login-card {
      width: 100%; max-width: 400px;
    }
    .login-card mat-card-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
    .login-card mat-card-subtitle { font-size: 0.875rem; color: #64748b; }
    .login-card mat-card-header { padding-bottom: 8px; }
    .login-card mat-card-content { padding-top: 8px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .login-btn {
      height: 48px; font-size: 1rem; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 8px;
    }
    .error-msg {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; background: #fee2e2; border-radius: 8px;
      color: #b91c1c; font-size: 0.875rem;
    }
    .error-msg mat-icon { font-size: 18px; }
    .login-footer { margin-top: 24px; font-size: 0.75rem; color: #94a3b8; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  form = this.fb.group({ 
    email: ['', [Validators.required, Validators.email]], 
    password: ['', Validators.required] 
  });
  loading = signal(false);
  error = signal('');
  showPwd = signal(false);

  features = [
    { icon: 'receipt_long', title: 'Fee Management', desc: 'Create and manage fee structures for all classes' },
    { icon: 'payments', title: 'Payment Tracking', desc: 'Record and track all student payments in real-time' },
    { icon: 'bar_chart', title: 'Financial Reports', desc: 'Target vs actual, defaulter lists, class-wise summaries' },
    { icon: 'notifications_active', title: 'Auto Reminders', desc: 'Automated email alerts for overdue fees' },
  ];

  // Fixed: Added toggle method for password visibility
  togglePassword() {
    this.showPwd.update(v => !v);
  }

  login() {
    if (this.form.invalid) { 
      this.form.markAllAsTouched(); 
      return; 
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { 
        this.error.set(err.message || 'Invalid credentials'); 
        this.loading.set(false); 
      }
    });
  }
}