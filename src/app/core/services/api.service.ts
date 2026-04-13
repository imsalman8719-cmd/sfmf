import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResult, PaginationParams } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = environment.apiUrl;
  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, v); });
    return this.http.get<ApiResponse<T>>(`${this.BASE}${path}`, { params: httpParams }).pipe(map(r => r.data));
  }

  getPaginated<T>(path: string, pagination: PaginationParams, filters?: Record<string, any>): Observable<PaginatedResult<T>> {
    return this.get<PaginatedResult<T>>(path, { ...pagination, ...filters });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.BASE}${path}`, body).pipe(map(r => r.data));
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.BASE}${path}`, body).pipe(map(r => r.data));
  }

  patch<T>(path: string, body?: any): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.BASE}${path}`, body ?? {}).pipe(map(r => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.BASE}${path}`).pipe(map(r => r.data));
  }
}
