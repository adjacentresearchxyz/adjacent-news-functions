import os
from markets.KalshiClientsBaseV2 import ExchangeClient
from utils.http import AsyncHTTPUtils  
from js import console

class KalshiClient:
    def __init__(self, env):
        self.prod_api_base = "https://trading-api.kalshi.com/trade-api/v2"
        self.api = AsyncHTTPUtils(env.SUPABASE_URL)
        self.env = env

    # async def query_market(self, market):
    #     response = await self.api.get(
    #         f"rest/v1/markets_data?adj_ticker=eq.{market}",
    #         headers={
    #             "apikey": self.env.SUPABASE_ANON_KEY,
    #             "Authorization": f"Bearer {self.env.SUPABASE_ANON_KEY}"
    #         }
    #     )
    #     return response
    
    # async def get_latest_market(self, market, data):
    #     response = await self.api.get(
    #         f"rest/v1/markets_data?platform=eq.Kalshi&",
    #         headers={
    #             "apikey": self.env.SUPABASE_ANON_KEY,
    #             "Authorization": f"Bearer {self.env.SUPABASE_ANON_KEY}"
    #         }
    #     )
    #     return response

    async def fetch_all_markets(self):
        exchange_client = ExchangeClient(exchange_api_base=self.prod_api_base, email=self.env.KALSHI_EMAIL, password=self.env.KALSHI_PASSWORD)
        await exchange_client.async_init()

        all_markets = []
        cursor = ''
        while True:
            market_params = {
                'limit': 1000,
                'cursor': cursor,
                'event_ticker': None,
                'series_ticker': None,
                'max_close_ts': None,
                'min_close_ts': None,
                'status': 'open',
                'tickers': None
            }
            markets_response = await exchange_client.get_markets(**market_params)

            # print(f"Fetched {len(markets_response.markets)} markets with cursor {markets_response.cursor}...")

            all_markets.extend(markets_response.markets)
            cursor = markets_response.cursor
            if not cursor:  # If cursor is empty, we've fetched all markets
                break
        return all_markets

    async def process_data(self):
        fetched_data = await self.fetch_all_markets()

        # Map the data
        mapped_markets = [{
            "ticker": market.ticker,
            "adj_ticker": f"ADJ-KALSHI-{market.ticker.replace('.', '/.')}",
            "market_type": market.market_type,
            "reported_date": market.open_time,
            "end_date": market.close_time,
            "market_slug": market.ticker, 
            "open_interest": market.open_interest,
            "volume": market.volume,
            "liquidity": market.liquidity,
            "probability": market.last_price,
            "question": market.title,
            "description": market.subtitle,
            "rules": market.rules_primary,
            "forecasts": None,  # No forecasts provided
            "result": market.result,
            "link": f"https://kalshi.com/markets/{market.ticker}",
            "category": market.category,
            "status": market.status,
            "platform": "Kalshi",
        } for market in fetched_data]

        return mapped_markets

        # for market in mapped_markets:
        #     try:
        #         # Check if the ticker exists in the database
        #         # response = supabase.table('markets_data').select('adj_ticker').eq('adj_ticker', f"ADJ-KALSHI-{market['ticker']}").execute()
        #         response = self.query_market(f"ADJ-KALSHI-{market['ticker']}")
        #         if response.data and len(response.data) > 0:
        #             # Ticker exists, update the probability
        #             # supabase.table('markets_data').update({"probability": market["probability"]}).eq('adj_ticker', f"ADJ-KALSHI-{market['ticker']}").execute()
        #             self.update_market(
        #                 response.data[0]["adj_ticker"],
        #                 {"probability": market["probability"]}
        #             )
        #             print(f"Updated probability for ticker: {market['adj_ticker']}")
        #         else:
        #             # Ticker does not exist, insert new market data
        #             # Generate Embedding from Headline 
        #             # Prepare the API request
        #             url = 'https://fyeyeurwgxklumxgpcgz.supabase.co/functions/v1/embed'
        #             headers = {
        #                 'Authorization': f"Bearer {os.getenv('SUPABASE_ANON_KEY')}",
        #                 'Content-Type': 'application/json'
        #             }
        #             data = {"input": market["question"]}
                    
        #             # Send the POST request
        #             response = self.api.post(url, data=data, headers=headers)
                    
        #             # Check if the request was successful
        #             if response.status_code == 200:
        #                 output = response.json()  # Assuming the API returns the embedding in JSON format
        #                 embedding = output["embedding"]
        #             else:
        #                 print(f"Failed to generate embedding for market: {market['question']}")
        #                 embedding = None  # Handle failed embedding generation

        #             # Insert into DB
        #             # supabase.table('markets_data').insert({
        #             #     "ticker": market["ticker"],
        #             #     "adj_ticker": f"ADJ-KALSHI-{market['ticker']}",
        #             #     "market_type": market["market_type"],
        #             #     "reported_date": market["reported_date"],
        #             #     "end_date": market["end_date"],
        #             #     "market_slug": market["market_slug"],
        #             #     "open_interest": market["open_interest"],
        #             #     "volume": market["volume"],
        #             #     "liquidity": market["liquidity"],
        #             #     "probability": market["probability"],
        #             #     "question": market["question"],
        #             #     "description": market["description"],
        #             #     "rules": market["rules"],
        #             #     "forecasts": market["forecasts"],
        #             #     "result": market["result"],
        #             #     "link": market["link"],
        #             #     "platform": market["platform"],
        #             #     "status": market["status"],
        #             #     "category": market["category"],
        #             #     "question_embedding": embedding
        #             # }).execute()

        #             self.insert_market(
        #                 {
        #                     "ticker": market["ticker"],
        #                     "adj_ticker": f"ADJ-KALSHI-{market['ticker']}",
        #                     "market_type": market["market_type"],
        #                     "reported_date": market["reported_date"],
        #                     "end_date": market["end_date"],
        #                     "market_slug": market["market_slug"],
        #                     "open_interest": market["open_interest"],
        #                     "volume": market["volume"],
        #                     "liquidity": market["liquidity"],
        #                     "probability": market["probability"],
        #                     "question": market["question"],
        #                     "description": market["description"],
        #                     "rules": market["rules"],
        #                     "forecasts": market["forecasts"],
        #                     "result": market["result"],
        #                     "link": market["link"],
        #                     "platform": market["platform"],
        #                     "status": market["status"],
        #                     "category": market["category"],
        #                     "question_embedding": embedding
        #                 }
        #             )

        #             # print(f"Inserted new market data for ticker: {market['ticker']}")
        #     except Exception as e:
        #         print(f"Error during data processing: {e}")

    # Main async function to run the tasks
    # async def main():
    #     await process_data()
    #     print("Data processing and insertion complete")

    # # Run the main function using asyncio
    # if __name__ == "__main__":
    #     asyncio.run(main())