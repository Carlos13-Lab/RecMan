import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { ApiError, createClient } from "../../shared/http";
import { getDeviceInfo } from "./device";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000";
const UUID_KEY = "recman.uuid";
const TOKEN_KEY = "recman.token";

let token: string | null = null;

// Authenticated client for the whole app. On 401 it logs in again and retries once.
export const request = createClient({
  baseUrl: API_URL,
  getToken: async () => (token ??= await SecureStore.getItemAsync(TOKEN_KEY)),
  refreshToken: async () => {
    const uuid = await SecureStore.getItemAsync(UUID_KEY);
    if (!uuid) throw new ApiError(401, "No se encontró la identidad del dispositivo");
    return loginOrRegister(uuid);
  },
});

// Ask /verify first: the backend's login handler has no error handling, so
// logging in an unknown uuid kills the process instead of returning 404.
async function loginOrRegister(uuid: string): Promise<string> {
  const { exists } = await request<{ exists: boolean }>(`/api/auth/verify/${uuid}`, { auth: false });
  const res: { token: string } = exists
    ? await request(`/api/auth/login/${uuid}`, { method: "POST", auth: false })
    : await request("/api/auth/register", { method: "POST", auth: false, body: { uuid, deviceInfo: getDeviceInfo() } });
  token = res.token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

export type BootStep = "connect" | "register" | "load";

// Create the device identity once, make sure we hold a token, then touch an
// authenticated endpoint (also renews a stale stored token via the 401 retry).
export async function bootstrap(onStep: (step: BootStep) => void = () => {}): Promise<void> {
  onStep("connect");
  let uuid = await SecureStore.getItemAsync(UUID_KEY);
  if (!uuid) {
    uuid = randomUUID();
    await SecureStore.setItemAsync(UUID_KEY, uuid);
  }
  if (!(await SecureStore.getItemAsync(TOKEN_KEY))) {
    onStep("register");
    await loginOrRegister(uuid);
  }
  onStep("load");
  await request("/api/dashboard/metrics");
}
