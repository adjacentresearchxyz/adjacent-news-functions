import { MappedMarket } from '../utils/types';

// Example interface for the Market
// interface Market {
//     enable_order_book: boolean;
//     active: boolean;
//     closed: boolean;
//     archived: boolean;
//     accepting_orders: boolean;
//     accepting_order_timestamp: null | string;
//     minimum_order_size: number;
//     minimum_tick_size: number;
//     condition_id: string;
//     question_id: string;
//     question: string;
//     description: string;
//     market_slug: string;
//     end_date_iso: string;
//     game_start_time: null | string;
//     seconds_delay: number;
//     fpmm: string;
//     maker_base_fee: number;
//     taker_base_fee: number;
//     notifications_enabled: boolean;
//     neg_risk: boolean;
//     neg_risk_market_id: string;
//     neg_risk_request_id: string;
//     icon: string;
//     image: string;
//     rewards: Rewards;
//     is_50_50_outcome: boolean;
//     tokens: Token[];
//     tags: string[];
// }

// Example interface for the market response
// interface MarketResponse {
//     data: Market[];
//     next_cursor: string;
//     limit: number;
//     count: number;
// }

class Client {
    private prod_api_base: string;

    constructor() {
        this.prod_api_base = "<API-ENDPOINT>";
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
            if (marketsResponse.next_cursor === "") { // use this to indicate the end of the markets, maybe you use a cursor / pointer, maybe just when you return no markets
                break;
            }
        }
        return allMarkets;
    }

    async processData(env): Promise<MappedMarket[]> {
        const fetchedData = await this.fetchAllMarkets();

        // dump raw data into r2
        const key = `<EXCHANGE-NAME>-${new Date().toISOString()}`;
        const uploadResult = await env.RAW_DATA.put(key, JSON.stringify(fetchedData));
        console.log(`Raw data upload ${uploadResult ? 'succeeded' : 'failed'} for key: ${key}`);

        // Map the data
        const mappedMarkets: MappedMarket[] = fetchedData.map(market => ({
            ticker: <MARKET-TICKER>,
            adj_ticker: `ADJ-<EXCHANGE-NAME>>-${<MARKET-TICKER>.replace('.', '/.').toUpperCase()}`,
            market_type: "binary",
            reported_date: new Date().toISOString().replace('T', ' ').slice(0, 19) + '+00',
            end_date: <MARKET-END-DATE> ? <MARKET-END-DATE>.replace('T', ' ').slice(0, 19) + '+00' : null,
            market_slug: <MARKET-TICKER>,
            open_interest: <MARKET-OPEN-INTEREST>, // If not available, we can infer from trade data
            volume: <MARKET-VOLUME>, // If not available, we can infer from trade data
            liquidity: <MARKET-LIQUIDITY>, // If not available, we can infer from trade data
            probability: <MARKET-PROABILITY>, // If not available, we can infer from trade data
            question: <MARKET-QUESTION>,
            description: <MARKET-DESCRIPTION>,
            rules: <MARKET-RULES>, // Potentially no rules provided, that's ok. This is good if you are regulated or point to external resolution critera
            forecasts: <MARKET-FORECASTS>, // Potentially no forecasts provided, that's ok especially if you are a real money exchange. This could also be unique traders
            result: <MARKET-RESULT>, // If market hasn't resolved, there isn't a result
            link: <MARKET-LINK>, // direct link where this market can be traded
            category: <MARKET-TAGS>, // used for categorization
            status: <MARKET-STATUS>, // should be either active or finalized
            platform: <EXCHANGE-NAME>,
        }));

        return mappedMarkets;
    }
}

export default Client;