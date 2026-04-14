import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, FeeInvoice, UserRole, InvoiceStatus } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTabsModule,
     MatIconModule, MatButtonModule, MatDividerModule, MatTableModule, MatProgressBarModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      @if (student()) {
        <!-- Header -->
        <div class="flex-between mb-6">
          <div style="display:flex;align-items:center;gap:16px">
            <div class="big-avatar">{{ (student()!.user?.firstName||'U')[0] }}{{ (student()!.user?.lastName||'U')[0] }}</div>
            <div>
              <h1 class="section-title" style="margin-bottom:2px">{{ student()!.user?.firstName }} {{ student()!.user?.lastName }}</h1>
              <p class="text-mono" style="color:#64748b">{{ student()!.registrationNumber }}</p>
              <div style="display:flex;gap:8px;margin-top:6px">
                <span class="badge" [class]="'badge-' + student()!.admissionStatus">{{ student()!.admissionStatus | statusLabel }}</span>
                <span class="badge" [class]="student()!.isActive ? 'badge-active' : 'badge-inactive'">{{ student()!.isActive ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <a mat-stroked-button routerLink="/students"><mat-icon>arrow_back</mat-icon> Back</a>
            @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.ADMISSION)) {
              <a mat-stroked-button [routerLink]="['edit']"><mat-icon>edit</mat-icon> Edit</a>
            }
            @if (auth.hasRole(UserRole.SUPER_ADMIN, UserRole.FINANCE)) {
              <a mat-flat-button color="primary" [routerLink]="['/invoices/generate']" [queryParams]="{studentId: student()!.id}">
                <mat-icon>add</mat-icon> Generate Invoice
              </a>
            }
          </div>
        </div>

        <!-- Fee Ledger Summary -->
        @if (ledger()) {
          <div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
            <div class="kpi-card kpi-purple">
              <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
              <span class="kpi-label">Total Billed</span>
              <span class="kpi-value">{{ fmtAmt(ledger()!.summary.totalBilled) }}</span>
            </div>
            <div class="kpi-card kpi-green">
              <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
              <span class="kpi-label">Paid</span>
              <span class="kpi-value">{{ fmtAmt(ledger()!.summary.totalPaid) }}</span>
            </div>
            <div class="kpi-card kpi-orange">
              <div class="kpi-icon"><mat-icon>pending</mat-icon></div>
              <span class="kpi-label">Outstanding</span>
              <span class="kpi-value">{{ fmtAmt(ledger()!.summary.totalDue) }}</span>
            </div>
            <div class="kpi-card kpi-blue">
              <div class="kpi-icon"><mat-icon>discount</mat-icon></div>
              <span class="kpi-label">Discounts</span>
              <span class="kpi-value">{{ fmtAmt(ledger()!.summary.totalDiscount) }}</span>
            </div>
          </div>
        }

        <mat-tab-group>
          <!-- Profile Tab -->
          <mat-tab label="Profile">
            <div class="form-grid-2 mt-6">
              <mat-card>
                <mat-card-header><mat-card-title>Personal Info</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-row"><span class="info-label">Email</span><span>{{ student()!.user?.email }}</span></div>
                    <div class="info-row"><span class="info-label">Phone</span><span>{{ student()!.user?.phone || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Gender</span><span>{{ student()!.user?.gender || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Blood Group</span><span>{{ student()!.bloodGroup || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Nationality</span><span>{{ student()!.nationality || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Address</span><span>{{ student()!.user?.address || '—' }}</span></div>
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card>
                <mat-card-header><mat-card-title>Academic Info</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-row"><span class="info-label">Class</span><span>{{ student()!.class?.name || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Roll No.</span><span>{{ student()!.rollNumber || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Admission Date</span><span>{{ student()!.admissionDate | date }}</span></div>
                    <div class="info-row"><span class="info-label">Previous School</span><span>{{ student()!.previousSchool || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Transport</span><span>{{ student()!.transportRequired ? 'Yes' : 'No' }}</span></div>
                    <div class="info-row"><span class="info-label">Hostel</span><span>{{ student()!.hostelRequired ? 'Yes' : 'No' }}</span></div>
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card>
                <mat-card-header><mat-card-title>Parent / Guardian</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-row"><span class="info-label">Father</span><span>{{ student()!.fatherName || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Father Phone</span><span>{{ student()!.fatherPhone || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Father Email</span><span>{{ student()!.fatherEmail || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Mother</span><span>{{ student()!.motherName || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Mother Phone</span><span>{{ student()!.motherPhone || '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Emergency</span><span>{{ student()!.user?.phone || '—' }}</span></div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Invoices Tab -->
          <mat-tab label="Invoices">
            <div class="table-container mt-6">
              <table mat-table [dataSource]="ledger()?.invoices || []">
                <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice No.</th><td mat-cell *matCellDef="let i"><span class="text-mono">{{ i.invoiceNumber }}</span></td></ng-container>
                <ng-container matColumnDef="label"><th mat-header-cell *matHeaderCellDef>Period</th><td mat-cell *matCellDef="let i">{{ i.billingLabel || '—' }}</td></ng-container>
                <ng-container matColumnDef="due"><th mat-header-cell *matHeaderCellDef>Due Date</th><td mat-cell *matCellDef="let i">{{ i.dueDate | date:'mediumDate' }}</td></ng-container>
                <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let i" style="font-weight:600">{{ i.totalAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="paid"><th mat-header-cell *matHeaderCellDef>Paid</th><td mat-cell *matCellDef="let i" style="color:#16a34a">{{ i.paidAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let i" [style.color]="i.balanceAmount > 0 ? '#dc2626' : '#16a34a'">{{ i.balanceAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
                <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i"><span class="badge" [class]="'badge-' + i.status">{{ i.status | statusLabel }}</span></td></ng-container>
                <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let i"><a mat-icon-button [routerLink]="['/invoices', i.id]"><mat-icon>visibility</mat-icon></a></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="invoiceCols"></tr>
                <tr mat-row *matRowDef="let row; columns: invoiceCols;"></tr>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .big-avatar{width:64px;height:64px;border-radius:50%;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;flex-shrink:0}
    .info-grid{display:flex;flex-direction:column;gap:10px;margin-top:8px}
    .info-row{display:flex;gap:12px;font-size:.875rem}
    .info-label{color:#64748b;width:120px;flex-shrink:0;font-weight:500}
  `]
})
export class StudentDetailComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  UserRole = UserRole;
  student = signal<Student | null>(null);
  ledger = signal<any>(null);
  invoiceCols = ['invoice','label','due','total','paid','balance','status','actions'];

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.api.get<Student>(`/students/${id}`).subscribe(s => this.student.set(s));
    this.api.get<any>(`/reports/student-statement/${id}`).subscribe(l => this.ledger.set(l));
  }

  fmtAmt(n: number): string {
    if (n >= 1_000_000) return `₨${(n/1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₨${(n/1_000).toFixed(0)}K`;
    return `₨${(n||0).toFixed(0)}`;
  }
}
