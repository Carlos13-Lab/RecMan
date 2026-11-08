import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useBootstrap } from "../src/features/session/useBootstrap";
import { Welcome } from "../src/ui/Welcome";

// Keep the native splash up until the JS Welcome screen has mounted (no white flash).
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SessionGate() {
  const { ready, error, retry, step } = useBootstrap();
  useEffect(() => { SplashScreen.hideAsync(); }, []);
  if (!ready) return (
    <>
      <StatusBar style="light" />
      <Welcome step={step} error={error?.message} onRetry={() => retry()} />
    </>
  );
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SessionGate />
    </QueryClientProvider>
  );
}
