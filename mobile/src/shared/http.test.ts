import { ApiError, createClient } from "./http";

const json = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

function setup(fetchFn: jest.Mock, overrides: Record<string, unknown> = {}) {
  let token: string | null = "t1";
  const refreshToken = jest.fn(async () => {
    token = "t2";
    return token;
  });
  const request = createClient({
    baseUrl: "http://api",
    getToken: () => token,
    refreshToken,
    fetchFn,
    ...overrides,
  });
  return { request, refreshToken };
}

describe("createClient", () => {
  it("sends the bearer token and parses JSON", async () => {
    const f = jest.fn(() => json(200, { ok: 1 }));
    const { request } = setup(f);
    await expect(request("/api/x")).resolves.toEqual({ ok: 1 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api/api/x");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t1");
  });

  it("serialises a body as JSON", async () => {
    const f = jest.fn(() => json(201, { token: "x" }));
    const { request } = setup(f);
    await request("/api/auth/register", { method: "POST", body: { uuid: "u" }, auth: false });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"uuid":"u"}');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("sends FormData untouched, without a JSON content type (fetch sets the multipart boundary)", async () => {
    const f = jest.fn(() => json(200, { ok: 1 }));
    const { request } = setup(f);
    const form = new FormData();
    form.append("image", "x");
    await request("/api/up", { method: "POST", body: form });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.body).toBe(form);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t1");
  });

  it("on 401 refreshes the token and retries exactly once", async () => {
    const f = jest
      .fn()
      .mockImplementationOnce(() => json(401, { message: "expired" }))
      .mockImplementationOnce(() => json(200, { ok: 2 }));
    const { request, refreshToken } = setup(f);
    await expect(request("/api/x")).resolves.toEqual({ ok: 2 });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    const retryInit = (f.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer t2");
  });

  it("throws if the retry is also 401 (no loop)", async () => {
    const f = jest.fn(() => json(401, { message: "nope" }));
    const { request, refreshToken } = setup(f);
    await expect(request("/api/x")).rejects.toMatchObject({ status: 401, message: "nope" });
    expect(f).toHaveBeenCalledTimes(2);
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on 401 for unauthenticated calls", async () => {
    const f = jest.fn(() => json(401, { message: "bad" }));
    const { request, refreshToken } = setup(f);
    await expect(request("/api/auth/login/u", { method: "POST", auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(refreshToken).not.toHaveBeenCalled();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("surfaces the server message and status on errors", async () => {
    const f = jest.fn(() => json(404, { message: "User not found" }));
    const { request } = setup(f);
    await expect(request("/api/x")).rejects.toMatchObject({ status: 404, message: "User not found" });
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    const f = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error("bad json")) } as Response),
    );
    const { request } = setup(f);
    await expect(request("/api/x")).rejects.toMatchObject({ status: 500, message: "La solicitud falló (500)" });
  });

  it("aborts and reports a timeout when the server hangs", async () => {
    jest.useFakeTimers();
    try {
      const f = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_res, rej) => {
            init.signal?.addEventListener("abort", () => rej(new Error("aborted")));
          }),
      );
      const { request } = setup(f as unknown as jest.Mock, { timeoutMs: 15000 });
      const assertion = expect(request("/api/x")).rejects.toMatchObject({ status: 0, message: "La solicitud tardó demasiado" });
      await jest.advanceTimersByTimeAsync(15000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it("lets a call override the timeout (slow photo uploads)", async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      const f = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_res, rej) => {
            init.signal?.addEventListener("abort", () => {
              aborted = true;
              rej(new Error("aborted"));
            });
          }),
      );
      const { request } = setup(f as unknown as jest.Mock, { timeoutMs: 15000 });
      const assertion = expect(request("/api/x", { method: "POST", timeoutMs: 60000 })).rejects.toMatchObject({ status: 0 });
      await jest.advanceTimersByTimeAsync(15000);
      expect(aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(45000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it("wraps network failures", async () => {
    const f = jest.fn(() => Promise.reject(new TypeError("Network request failed")));
    const { request } = setup(f);
    await expect(request("/api/x")).rejects.toMatchObject({
      status: 0,
      message: "No se pudo conectar con el servidor",
    });
  });
});
