import { MappedMarket } from '../utils/types';

interface Token {
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
}

interface Rewards {
    rates: null;
    min_size: number;
    max_spread: number;
}

interface Market {
    enable_order_book: boolean;
    active: boolean;
    closed: boolean;
    archived: boolean;
    accepting_orders: boolean;
    accepting_order_timestamp: null | string;
    minimum_order_size: number;
    minimum_tick_size: number;
    condition_id: string;
    question_id: string;
    question: string;
    description: string;
    market_slug: string;
    end_date_iso: string;
    game_start_time: null | string;
    seconds_delay: number;
    fpmm: string;
    maker_base_fee: number;
    taker_base_fee: number;
    notifications_enabled: boolean;
    neg_risk: boolean;
    neg_risk_market_id: string;
    neg_risk_request_id: string;
    icon: string;
    image: string;
    rewards: Rewards;
    is_50_50_outcome: boolean;
    tokens: Token[];
    tags: string[];
}

interface MarketResponse {
    data: Market[];
    next_cursor: string;
    limit: number;
    count: number;
}

class PolymarketClient {
    private prod_api_base: string;

    constructor() {
        this.prod_api_base = "https://clob.polymarket.com/";
    }

    async fetchAllMarkets(cursor: string = ""): Promise<Market[]> {
        let allMarkets: Market[] = [];
        while (true) {
            const response = await fetch(
                `${this.prod_api_base}markets?active=true&_sort=volume:desc&_limit=-1&next_cursor=${cursor}`
            );
            const marketsResponse: MarketResponse = await response.json();
            const marketsData = marketsResponse.data;

            // console.log(`Fetched ${marketsData.length} markets with cursor ${cursor}...`);

            allMarkets = allMarkets.concat(marketsData);

            cursor = marketsResponse.next_cursor;
            if (marketsResponse.next_cursor === "LTE=") {
                break;
            }
        }
        return allMarkets;
    }

    async processData(env): Promise<MappedMarket[]> {
        const fetchedData = await this.fetchAllMarkets();

        // dump raw data into r2
        const key = `polymarket-${new Date().toISOString()}`;
        const uploadResult = await env.RAW_DATA.put(key, JSON.stringify(fetchedData));
        console.log(`Raw data upload ${uploadResult ? 'succeeded' : 'failed'} for key: ${key}`);

        // Map the data
        const mappedMarkets: MappedMarket[] = fetchedData.map(market => ({
            ticker: market.market_slug,
            adj_ticker: `ADJ-POLYMARKET-${market.market_slug.replace('.', '/.').toUpperCase()}`,
            market_type: "binary",
            reported_date: new Date().toISOString().replace('T', ' ').slice(0, 19) + '+00',
            end_date: market.end_date_iso ? market.end_date_iso.replace('T', ' ').slice(0, 19) + '+00' : null,
            market_slug: market.market_slug,
            open_interest: null,
            volume: null,
            liquidity: null,
            probability: market.tokens[0]?.price ? market.tokens[0].price * 100 : null,
            question: market.question,
            description: market.description,
            rules: null, // No rules provided
            forecasts: null, // No forecasts provided
            result: null, // No result provided
            link: `https://polymarket.com/market/${market.market_slug}`,
            category: market.tags ? market.tags.filter(tag => tag) : [],
            status: market.active ? "active" : "finalized",
            platform: "Polymarket",
        }));

        return mappedMarkets;
    }
}

export default PolymarketClient;