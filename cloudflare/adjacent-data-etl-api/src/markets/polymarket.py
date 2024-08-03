from utils.http import AsyncHTTPUtils  
from js import console

from datetime import datetime

class PolymarketClient:
    def __init__(self, env):
        self.prod_api_base = "https://clob.polymarket.com/"
        self.api = AsyncHTTPUtils(env.SUPABASE_URL)
        self.env = env

    async def fetch_all_markets(self, cursor=""):
        all_markets = []
        while True:
            markets_response = await self.api.get(self.prod_api_base + f"markets?active=true&_sort=volume:desc&_limit=-1&next_cursor={cursor}", external=True)
            markets_data = markets_response.data

            # print(f"Fetched {len(markets_data)} markets with cursor {cursor}...")

            all_markets.extend(markets_data)
            
            cursor = markets_response.next_cursor
            if markets_response.next_cursor == "LTE=":
                break
        return all_markets

    async def process_data(self):
        fetched_data = await self.fetch_all_markets()

        # Map the data
        mapped_markets = [{
            "ticker": market.market_slug,
            "adj_ticker": f"ADJ-POLYMARKET-{market.market_slug.replace('.', '/.').upper()}",
            "market_type": "binary",
            "reported_date": market.accepting_order_timestamp,
            "end_date": market.end_date_iso,
            "market_slug": market.market_slug, 
            "open_interest": None,
            "volume": None,
            "liquidity": None,
            "probability": market.tokens[0].price,
            "question": market.question,
            "description": market.description,
            "rules": None, # No rules provided
            "forecasts": None,  # No forecasts provided
            "result": None,  # No result provided
            "link": f"https://polymarket.com/market/{market.market_slug}",
            "category": [tag for tag in market.tags if market.tags] if market.tags else [],
            "status": market.active and "active" or "finalized",
            "platform": "Polymarket",
        } for market in fetched_data]

        return mapped_markets