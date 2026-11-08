import { useQuery, type QueryClient } from "@tanstack/react-query";
import { localDateString } from "../../shared/dates";
import type { AppNotification, CalendarDay, CalendarRange, DashboardMetrics, Recipe } from "../../shared/types";
import { request } from "../session/session";

// Shared by Home and the quick-sale sheet (exchange rate). Keys are prefixes for invalidation.
export const useTodayMetrics = () => {
  const today = localDateString();
  return useQuery({ queryKey: ["metrics", today], queryFn: () => request<DashboardMetrics>(`/api/dashboard/metrics?date=${today}`) });
};
export const useRange = (from: string, to: string) =>
  useQuery({ queryKey: ["calendar-range", from, to], queryFn: () => request<CalendarRange>(`/api/calendar/range?from=${from}&to=${to}`) });
export const useDay = (date: string) =>
  useQuery({ queryKey: ["calendar-day", date], queryFn: () => request<CalendarDay>(`/api/calendar/day/${date}`) });
export const useRecipes = () => useQuery({ queryKey: ["recipes"], queryFn: () => request<Recipe[]>("/api/recipes") });
export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: () => request<AppNotification[]>("/api/notifications?limit=50") });

// After a sale: everything Home shows derives from sales.
export const invalidateSales = (qc: QueryClient) =>
  Promise.all(["metrics", "calendar-range", "calendar-day"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
