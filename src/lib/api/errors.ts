export const ApiErrorCode = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_SESSION_INVALID",
  "AUTH_SESSION_EXPIRED",
  "AUTH_RATE_LIMITED",
  "PASSWORD_CHANGE_REQUIRED",
  "PASSWORD_CURRENT_INVALID",
  "PASSWORD_CONFIRMATION_MISMATCH",
  "ACCOUNT_DISABLED",
  "MEMBER_PROFILE_INACTIVE",
  "FORBIDDEN",
  "RESOURCE_NOT_FOUND",
  "STATE_TRANSITION_INVALID",
  "IDEMPOTENCY_CONFLICT",
  "JOIN_APPLICATION_DUPLICATE",
  "JOIN_APPLICATION_NOT_REVIEWABLE",
  "ACCOUNT_IDENTITY_CONFLICT",
  "ACCOUNT_PROVISION_FAILED",
  "INVITE_CODE_INVALID",
  "INVITE_CODE_NOT_ACTIVE",
  "INVITE_CODE_EXPIRED",
  "INVITE_CODE_REVOKED",
  "INVITE_CODE_EXHAUSTED",
  "INVITE_CODE_BINDING_MISMATCH",
  "INVITE_CODE_USAGE_LIMIT_INVALID",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof ApiErrorCode)[number];
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

const defaultStatus: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_SESSION_INVALID: 401,
  AUTH_SESSION_EXPIRED: 401,
  AUTH_RATE_LIMITED: 429,
  PASSWORD_CHANGE_REQUIRED: 403,
  PASSWORD_CURRENT_INVALID: 400,
  PASSWORD_CONFIRMATION_MISMATCH: 400,
  ACCOUNT_DISABLED: 403,
  MEMBER_PROFILE_INACTIVE: 403,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  STATE_TRANSITION_INVALID: 409,
  IDEMPOTENCY_CONFLICT: 409,
  JOIN_APPLICATION_DUPLICATE: 409,
  JOIN_APPLICATION_NOT_REVIEWABLE: 409,
  ACCOUNT_IDENTITY_CONFLICT: 409,
  ACCOUNT_PROVISION_FAILED: 500,
  INVITE_CODE_INVALID: 400,
  INVITE_CODE_NOT_ACTIVE: 409,
  INVITE_CODE_EXPIRED: 409,
  INVITE_CODE_REVOKED: 409,
  INVITE_CODE_EXHAUSTED: 409,
  INVITE_CODE_BINDING_MISMATCH: 409,
  INVITE_CODE_USAGE_LIMIT_INVALID: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number; fieldErrors?: FieldErrors; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? defaultStatus[code];
    this.fieldErrors = options.fieldErrors;
  }
}

export function toPublicError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("INTERNAL_ERROR", "服务暂时不可用，请稍后重试");
}
