import axios from "axios";
import NodeCache from "node-cache";
import { AppError } from "../errors/AppError";

const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hora

const EXCHANGE_RATE_CACHE_KEY = "usd_to_bs_rate";

export class ExchangeRateService {
  static async getExchangeRate(): Promise<number> {
    const cached = cache.get<number>(EXCHANGE_RATE_CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    const url =
      process.env.EXCHANGE_RATE_API_URL ||
      "https://ve.dolarapi.com/v1/dolares/oficial";

    try {
      const response = await axios.get(url);
      const promedio = response.data?.promedio;

      if (typeof promedio !== "number") {
        throw new Error("Invalid response: promedio is not a number");
      }

      cache.set(EXCHANGE_RATE_CACHE_KEY, promedio);
      return promedio;
    } catch (error) {
      const fallback = cache.get<number>(EXCHANGE_RATE_CACHE_KEY);
      if (fallback !== undefined) {
        return fallback;
      }
      throw new AppError("Cannot fetch exchange rate", 503, {
        reason: "external_api_error"
      });
    }
  }

  static async convertUsdToBs(amountUsd: number): Promise<number> {
    const rate = await this.getExchangeRate();
    return amountUsd * rate;
  }
}

