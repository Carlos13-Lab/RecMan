import type { Ingredient } from "../features/inventory/inventory";

export type Money = { usd: number; bs: number };

// GET /api/dashboard/metrics (computed fields: numbers, unrounded)
export type DashboardMetrics = {
  date: string;
  salesCount: number;
  totalRevenue: Money;
  totalCost: Money;
  totalProfit: Money;
  percentages: { expenses: number; profit: number };
  exchangeRate: number;
};

// Sale rows from GET /api/calendar/{range,day/:date} (entity numbers arrive as strings)
export type CalendarSale = {
  id: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  totalUsd: string;
  totalBs: string;
  createdAt: string; // ISO
  recipe?: { id: string; name: string; category: string | null; imageUrl?: string | null; profitPercentage?: string } | null;
};
export type CalendarRange = { from: string; to: string; sales: CalendarSale[] };
export type CalendarDay = { date: string; sales: CalendarSale[] };

// GET /api/recipes (computed price fields are numbers, unrounded)
export type Recipe = {
  id: string;
  name: string;
  category: string | null;
  imageUrl?: string | null; // relative path; see resolveImageUrl
  description?: string | null;
  notes?: string | null;
  baseServings: number;
  profitPercentage: string;
  costUsd: number;
  costBs: number;
  priceUsd: number;
  priceBs: number;
  ingredients: { id: string; quantity: string; ingredient: Ingredient }[];
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string | null;
  createdAt: string; // ISO
};
