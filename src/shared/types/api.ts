export interface ApiBaseResponse {
  code: number
  message: string
  timestamp: number
  request_id?: string
}

export interface ApiSuccessResponse<T> extends ApiBaseResponse {
  data: T
}

export interface ApiErrorResponse extends ApiBaseResponse {
  error?: string
  error_code?: string
  error_hint?: string
  errors?: Array<{
    field: string
    message: string
    value?: string
  }>
}
