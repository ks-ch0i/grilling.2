export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  };
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return jsonResponse(error.status, { error: error.code });
  }

  return jsonResponse(503, { error: 'service_unavailable' });
}
