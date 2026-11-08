import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { bootstrap, type BootStep } from "./session";

export function useBootstrap() {
  const [step, setStep] = useState<BootStep>("connect");
  const q = useQuery({ queryKey: ["bootstrap"], queryFn: async () => (await bootstrap(setStep), true), retry: false, staleTime: Infinity });
  return { ready: q.isSuccess, error: q.error as Error | null, retry: q.refetch, step };
}
