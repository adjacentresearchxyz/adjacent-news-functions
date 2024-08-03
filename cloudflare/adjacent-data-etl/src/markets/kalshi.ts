import { MappedMarket } from '../utils/types';

interface Environment {
  KALSHI_EMAIL: string;
  KALSHI_PASSWORD: string;
}

interface Market {
  ticker: string;
  market_type: string;
  open_time: string;
  close_time: string;
  open_interest: number;
  volume: number;
  liquidity: number;
  last_price: number;
  title: string;
  subtitle: string;
  rules_primary: string;
  result: string;
  category: string;
  status: string;
}

interface ApiResponse {
  markets: Market[];
  cursor: string;
}

class KalshiClient {
  private apiBase: string;
  private env: Environment;

  constructor(env: Environment) {
    this.apiBase = "https://trading-api.kalshi.com/trade-api/v2";
    this.env = env;
  }

  private async getAuthToken(): Promise<string> {
    const response = await fetch(`${this.apiBase}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.env.KALSHI_EMAIL,
        password: this.env.KALSHI_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate');
    }

    const data = await response.json();
    return data.token;
  }

  async fetchAllMarkets(): Promise<Market[]> {
    let allMarkets: Market[] = [];
    let cursor = '';
    const token = await this.getAuthToken();

    while (true) {
      const url = new URL(`${this.apiBase}/markets`);
      url.searchParams.append('limit', '1000');
      url.searchParams.append('cursor', cursor);
      url.searchParams.append('status', 'open');

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch markets');
        }

        const data: ApiResponse = await response.json();
        allMarkets = allMarkets.concat(data.markets);
        cursor = data.cursor;

        // console.log(`Fetched ${allMarkets.length} markets with cursor ${cursor}...`);

        if (!cursor) {
          break;
        }
      } catch (err) {
        console.error(err);
        break;
      }
    }

    return allMarkets;
  }

  async processData(env): Promise<MappedMarket[]> {
    const fetchedData = await this.fetchAllMarkets();
    // dump raw data into r2
    const key = `kalshi-${new Date().toISOString()}`;
    await env.RAW_DATA.put(key, JSON.stringify(fetchedData));

    const mappedMarkets: MappedMarket[] = fetchedData.map(market => ({
      ticker: market.ticker,
      adj_ticker: `ADJ-KALSHI-${market.ticker.replace('.', '/.')}`,
      market_type: market.market_type,
      reported_date: market.open_time,
      end_date: market.close_time,
      market_slug: market.ticker,
      open_interest: market.open_interest,
      volume: market.volume,
      liquidity: market.liquidity,
      probability: market.last_price,
      question: market.title,
      description: market.subtitle,
      rules: market.rules_primary,
      forecasts: null,
      result: market.result,
      link: `https://kalshi.com/markets/${market.ticker}`,
      category: market.category,
      status: market.status,
      platform: "Kalshi",
    }));

    return mappedMarkets;
  }
}

export default KalshiClient;