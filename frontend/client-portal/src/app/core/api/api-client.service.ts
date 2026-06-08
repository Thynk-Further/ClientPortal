import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

type RequestOptions = {
  withCredentials?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  constructor(private readonly httpClient: HttpClient) {}

  post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    options?: RequestOptions,
  ): Observable<TResponse> {
    return this.httpClient.post<TResponse>(url, body, {
      withCredentials: options?.withCredentials,
    });
  }
}
