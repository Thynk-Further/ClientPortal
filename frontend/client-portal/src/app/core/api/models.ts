export interface ApiErrorDto {
  code: string;
  message: string;
  type?: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  errors: ApiErrorDto[];
  meta: Record<string, unknown>;
}

export interface ApiOperationResult {
  success: boolean;
  message?: string;
}
