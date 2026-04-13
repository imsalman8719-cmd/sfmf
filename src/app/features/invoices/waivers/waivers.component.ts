import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { FeeWaiver } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-waivers',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, StatusLabelPipe],
  template: `
    <div class="page-container">
      <div class="flex-between mb-6">
        <div><h1 class="section-title">Fee Waivers</h1><p class="section-subtitle">Review and approve waiver requests</p></div>
        <a mat-stroked-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Invoices</a>
      </div>
      <div class="table-container">
        <table mat-table [dataSource]="waivers()">
          <ng-container matColumnDef="student"><th mat-header-cell *matHeaderCellDef>Student</th><td mat-cell *matCellDef="let w">{{ w.student?.user?.firstName }} {{ w.student?.user?.lastName }}</td></ng-container>
          <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice</th><td mat-cell *matCellDef="let w"><span class="text-mono">{{ w.invoice?.invoiceNumber }}</span></td></ng-container>
          <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let w" style="text-transform:capitalize">{{ w.type }}</td></ng-container>
          <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Waived Amount</th><td mat-cell *matCellDef="let w" style="font-weight:700;color:#0891b2">{{ w.waivedAmount | currency:'PKR ':'symbol':'1.0-0' }}</td></ng-container>
          <ng-container matColumnDef="reason"><th mat-header-cell *matHeaderCellDef>Reason</th><td mat-cell *matCellDef="let w">{{ w.reason }}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let w"><span class="badge" [class]="'badge-' + w.status">{{ w.status | statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let w">
              @if (w.status === 'pending') {
                <button mat-icon-button (click)="review(w, 'approved')" style="color:#16a34a" title="Approve"><mat-icon>check_circle</mat-icon></button>
                <button mat-icon-button (click)="review(w, 'rejected')" style="color:#dc2626" title="Reject"><mat-icon>cancel</mat-icon></button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </div>
    </div>
  `
})
export class WaiversComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  waivers = signal<FeeWaiver[]>([]);
  cols = ['student', 'invoice', 'type', 'amount', 'reason', 'status', 'actions'];

  ngOnInit() { this.load(); }
  load() {
    this.api.get<any>('/fee-invoices/waivers').subscribe(d => this.waivers.set(Array.isArray(d) ? d : d.data || []));
  }
  review(w: FeeWaiver, status: string) {
    this.api.patch(`/fee-invoices/waivers/${w.id}/review`, { status }).subscribe({ next: () => { this.snackBar.open('Waiver ' + status, 'OK'); this.load(); } });
  }
}
