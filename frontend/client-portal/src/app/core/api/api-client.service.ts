import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = object;
type RequestOptions = {
  withCredentials?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  constructor(private readonly httpClient: HttpClient) {}

  get<TResponse>(
    url: string,
    query?: QueryParams,
    options?: RequestOptions,
  ): Observable<TResponse> {
    return this.httpClient.get<TResponse>(url, {
      params: this.toHttpParams(query),
      withCredentials: options?.withCredentials,
    });
  }

  post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    query?: QueryParams,
    options?: RequestOptions,
  ): Observable<TResponse> {
    return this.httpClient.post<TResponse>(url, body, {
      params: this.toHttpParams(query),
      withCredentials: options?.withCredentials,
    });
  }

  private toHttpParams(query?: QueryParams): HttpParams | undefined {
    if (query === undefined) {
      return undefined;
    }

    let params = new HttpParams();
    for (const [key, value] of Object.entries(query as Record<string, QueryValue>)) {
      if (value === undefined || value === null) {
        continue;
      }

      params = params.set(key, String(value));
    }

    return params;
  }
}
