import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StatusLabelPipe } from '../../shared/pipes/status-label.pipe';

@Component({
  selector: 'app-kpi-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule, 
    MatTableModule, 
    MatDialogModule, 
    StatusLabelPipe,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './kpi-detail-dialog.component.html',
  styleUrls: ['./kpi-detail-dialog.component.scss']
})
export class KpiDetailDialogComponent {
  data = inject<any>(MAT_DIALOG_DATA);
  
  isPast(d: string) { 
    return new Date(d) < new Date(); 
  }
}