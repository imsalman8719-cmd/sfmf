import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

import { Student, FeeStructure, AcademicYear, FeeFrequency } from '../../../core/models';

interface StudentFeePlan {
  id?: string;
  feeStructureId: string;
  billingFrequency: FeeFrequency;
  customAmount?: number | null;
  notes?: string;
  feeStructure?: FeeStructure;
}

interface PlanPreview {
  hasPlan: boolean;
  plans: Array<{
    feeStructureName: string;
    billingFrequency: FeeFrequency;
    baseAmount: number;
    billedAmount: number;
    multiplier: number;
  }>;
  totalAmount: number;
}

const MULTIPLIER_LABEL: Record<string, string> = {
  one_time: '×1',
  monthly: '×1',
  quarterly: '×3',
  semi_annual: '×6',
  annual: '×12',
  custom: '×1',
};

@Component({
  selector: 'app-assign-plan',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatProgressSpinnerModule,
    MatDividerModule, MatTableModule, MatTooltipModule, MatChipsModule
  ],
  templateUrl: './assign-plan.component.html',
  styleUrl:'./assign-plan.component.scss'
})
export class AssignPlanComponent implements OnInit {
  private api: ApiService = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  MULTIPLIER_LABEL = MULTIPLIER_LABEL;

  student = signal<Student | null>(null);
  searching = signal(false);
  notFound = signal(false);
  saving = signal(false);
  years = signal<AcademicYear[]>([]);
  feeStructures = signal<FeeStructure[]>([]);
  planRows = signal<StudentFeePlan[]>([]);
  serverPreview = signal<PlanPreview | null>(null);
  editingIndex = signal<number | null>(null);

  regNoCtrl = this.fb.control('');
  yearCtrl = this.fb.control('');

  rowForm = this.fb.group({
    feeStructureId: ['', Validators.required],
    billingFrequency: [FeeFrequency.MONTHLY, Validators.required],
    customAmount: [null as number | null],
    notes: [''],
  });

  frequencies = [
    { v: FeeFrequency.MONTHLY, l: 'Monthly (×1)' },
    { v: FeeFrequency.QUARTERLY, l: 'Quarterly (×3)' },
    { v: FeeFrequency.SEMI_ANNUAL, l: 'Semi-Annual (×6)' },
    { v: FeeFrequency.ANNUAL, l: 'Annual (×12)' },
    { v: FeeFrequency.ONE_TIME, l: 'One-Time' },
  ];

  examples = [
    { freq: 'Monthly', desc: '8,500 × 1 — pay each month', amount: 'PKR 8,500' },
    { freq: 'Quarterly', desc: '8,500 × 3 — pay every 3 months', amount: 'PKR 25,500' },
    { freq: 'Semi-Annual', desc: '8,500 × 6 — pay every 6 months', amount: 'PKR 51,000' },
    { freq: 'Annual', desc: '8,500 × 12 — pay full year', amount: 'PKR 1,02,000' },
  ];

  availableFeeStructures() {
    const used = this.planRows().map(r => r.feeStructureId);
    const editIdx = this.editingIndex();
    const editingFs = editIdx !== null ? this.planRows()[editIdx]?.feeStructureId : null;
    return this.feeStructures().filter(fs => !used.includes(fs.id) || fs.id === editingFs);
  }

  ngOnInit() {
    this.api.get<any>('/academic-years').subscribe(r => {
      const ys = Array.isArray(r) ? r : r.data || [];
      this.years.set(ys);
      const cur = ys.find((y: AcademicYear) => y.isCurrent);
      if (cur) { this.yearCtrl.setValue(cur.id); this.onYearChange(cur.id); }
    });
    // Pre-fill from query params
    const qp = this.route.snapshot.queryParams;
    if (qp['regNo']) { this.regNoCtrl.setValue(qp['regNo']); this.lookupStudent(); }
    if (qp['studentId']) { this.lookupByStudentId(qp['studentId']); }
  }

  lookupStudent() {
    const regNo = this.regNoCtrl.value?.trim();
    if (!regNo) return;
    this.searching.set(true);
    this.notFound.set(false);
    this.student.set(null);
    this.planRows.set([]);
    this.serverPreview.set(null);

    this.api.getPaginated<Student>('/students', { limit: 1, search: regNo }, {}).subscribe({
      next: r => {
        const match = r.data.find(s => s.registrationNumber === regNo) || r.data[0];
        if (match) { this.student.set(match); if (this.yearCtrl.value) this.loadExistingPlan(match.id, this.yearCtrl.value); }
        else this.notFound.set(true);
        this.searching.set(false);
      },
      error: () => { this.notFound.set(true); this.searching.set(false); }
    });
  }

  lookupByStudentId(id: string) {
    this.api.get<Student>(`/students/${id}`).subscribe(s => {
      this.student.set(s);
      this.regNoCtrl.setValue(s.registrationNumber);
      if (this.yearCtrl.value) this.loadExistingPlan(s.id, this.yearCtrl.value);
    });
  }

  onYearChange(yearId: string) {
    this.api.getPaginated<FeeStructure>('/fee-structures', { limit: 100 }, { academicYearId: yearId, isActive: 'true' })
      .subscribe(r => this.feeStructures.set(r.data));
    if (this.student()) this.loadExistingPlan(this.student()!.id, yearId);
  }

  loadExistingPlan(studentId: string, yearId: string) {
    this.api.get<any[]>(`/student-fee-plans/student/${studentId}`, { academicYearId: yearId }).subscribe({
      next: plans => {
        const arr = Array.isArray(plans) ? plans : (plans as any).data || [];
        const rows = arr.map((p: any) => ({
          id: p.id,
          feeStructureId: p.feeStructureId,
          billingFrequency: p.billingFrequency,
          customAmount: p.customAmount ?? null,
          notes: p.notes,
          feeStructure: p.feeStructure,
        }));
        this.planRows.set(rows);
        if (rows.length) this.loadPreview(studentId, yearId);
      },
      error: () => { }
    });
  }

  loadPreview(studentId: string, yearId: string) {
    this.api.get<PlanPreview>(`/student-fee-plans/student/${studentId}/preview`, { academicYearId: yearId })
      .subscribe((p: PlanPreview) => this.serverPreview.set(p));
  }

  addRow() {
    if (this.rowForm.invalid) return;
    const v = this.rowForm.value as any;
    const fs = this.feeStructures().find(f => f.id === v.feeStructureId);
    const row: StudentFeePlan = {
      feeStructureId: v.feeStructureId,
      billingFrequency: v.billingFrequency,
      customAmount: v.customAmount || null,
      notes: v.notes || undefined,
      feeStructure: fs,
    };

    const editIdx = this.editingIndex();
    if (editIdx !== null) {
      const rows = [...this.planRows()];
      rows[editIdx] = { ...rows[editIdx], ...row };
      this.planRows.set(rows);
      this.editingIndex.set(null);
    } else {
      this.planRows.update(rows => [...rows, row]);
    }
    this.rowForm.reset({ billingFrequency: FeeFrequency.MONTHLY });
  }

  editRow(i: number) {
    const row = this.planRows()[i];
    this.editingIndex.set(i);
    this.rowForm.patchValue({
      feeStructureId: row.feeStructureId,
      billingFrequency: row.billingFrequency,
      customAmount: row.customAmount ?? null,
      notes: row.notes || '',
    });
  }

  cancelEdit() { this.editingIndex.set(null); this.rowForm.reset({ billingFrequency: FeeFrequency.MONTHLY }); }

  removeRow(i: number) {
    const row = this.planRows()[i];
    if (row.id) {
      this.api.delete(`/student-fee-plans/${row.id}`).subscribe({
        next: () => {
          this.snackBar.open('Plan removed successfully', 'OK', { duration: 3000 });
          this.planRows.update(rows => rows.filter((_, idx) => idx !== i));
          if (this.student() && this.yearCtrl.value) this.loadPreview(this.student()!.id, this.yearCtrl.value);
        },
        error: () => this.snackBar.open('Failed to remove plan from server', 'OK')
      });
    } else {
      this.planRows.update(rows => rows.filter((_, idx) => idx !== i));
    }
  }

  calcAmount(row: StudentFeePlan): number {
    if (row.customAmount) return row.customAmount;
    const base = Number(row.feeStructure?.amount || 0);
    const mult: Record<string, number> = { one_time: 1, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12, custom: 1 };
    return base * (mult[row.billingFrequency] || 1);
  }

  totalAmount() { return this.planRows().reduce((s, r) => s + this.calcAmount(r), 0); }

  getSelectedFsAmount(): number {
    const fsId = this.rowForm.get('feeStructureId')?.value;
    return Number(this.feeStructures().find(f => f.id === fsId)?.amount || 0);
  }

  calcPreviewAmount(): number {
    const base = this.getSelectedFsAmount();
    const freq = this.rowForm.get('billingFrequency')?.value as string;
    const mult: Record<string, number> = { one_time: 1, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12, custom: 1 };
    return base * (mult[freq] || 1);
  }

  savePlan() {
    const student = this.student();
    const yearId = this.yearCtrl.value;
    if (!student || !yearId) return;
    this.saving.set(true);

    const rows = this.planRows();
    const toCreate = rows.filter(r => !r.id);
    const toUpdate = rows.filter(r => !!r.id);

    const createAll = toCreate.map(r =>
      firstValueFrom(this.api.post<any>('/student-fee-plans', {
        studentId: student.id,
        feeStructureId: r.feeStructureId,
        academicYearId: yearId,
        billingFrequency: r.billingFrequency,
        customAmount: r.customAmount || undefined,
        notes: r.notes || undefined,
      }))
    );
    const updateAll = toUpdate.map(r =>
      firstValueFrom(this.api.put<any>(`/student-fee-plans/${r.id}`, {
        billingFrequency: r.billingFrequency,
        customAmount: r.customAmount || undefined,
        notes: r.notes || undefined,
      }))
    );

    Promise.all([...createAll, ...updateAll]).then(() => {
      this.snackBar.open('Fee plan saved!', 'OK', { duration: 4000 });
      this.saving.set(false);
      this.loadExistingPlan(student.id, yearId);
    }).catch(e => {
      this.snackBar.open(e?.message || 'Error saving plan', 'Close');
      this.saving.set(false);
    });
  }
}