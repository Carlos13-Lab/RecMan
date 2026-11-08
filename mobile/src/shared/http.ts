export class ApiError extends Error {
  constructor(
    public status: number, // 0 = network failure or timeout
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number };

type Config = {
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  refreshToken: () => Promise<string>; // log in again, return the new token
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

export function createClient({ baseUrl, getToken, refreshToken, fetchFn = fetch, timeoutMs = 15000 }: Config) {
  async function send(path: string, { method = "GET", body, auth = true, timeoutMs: callTimeout }: Options, token: string | null) {
    const headers: Record<string, string> = { Accept: "application/json" };
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json"; // FormData: fetch adds the multipart boundary
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    // Some backend handlers can hang, so every call is bounded.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, callTimeout ?? timeoutMs);
    try {
      return await fetchFn(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, timedOut ? "La solicitud tardó demasiado" : "No se pudo conectar con el servidor");
    } finally {
      clearTimeout(timer);
    }
  }

  return async function request<T>(path: string, opts: Options = {}): Promise<T> {
    const auth = opts.auth ?? true;
    let res = await send(path, opts, auth ? await getToken() : null);
    if (res.status === 401 && auth) {
      res = await send(path, opts, await refreshToken()); // retry once
    }
    const data = await res.json().catch(() => undefined);
    if (!res.ok) throw new ApiError(res.status, data?.message ?? `La solicitud falló (${res.status})`);
    return data as T;
  };
}
