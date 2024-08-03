export interface MappedMarket {
    ticker: string;
    adj_ticker: string;
    market_type: string;
    reported_date: string;
    end_date: string;
    market_slug: string;
    open_interest: number | null;
    volume: number | null;
    liquidity: number | null;
    probability: number;
    question: string;
    description: string;
    rules: string;
    forecasts: null;
    result: string;
    link: string;
    category: string;
    status: string;
    platform: string;
}