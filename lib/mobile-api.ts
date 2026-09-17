/**
 * Client-side fetch layer for the mobile-parity tree — hits the exact same
 * `/api/*` routes the Expo app calls (`mobile/src/lib/api.ts`), just without
 * the Bearer-token dance: same-origin `fetch` already carries the Clerk
 * session cookie. Mirrors `mobile/src/lib/queries.ts`'s hook shapes so
 * screens ported from that file need minimal changes.
 */

export class MobileApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function mobileApi<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MobileApiError(
      response.status,
      data?.error ?? "Terjadi kesalahan",
    );
  }

  return data as T;
}
