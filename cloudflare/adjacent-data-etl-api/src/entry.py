from js import console, Response
import json

from http import HTTPStatus
from urllib.parse import urlparse
from utils.transform import JsProxyEncoder

from markets.kalshi import KalshiClient
from markets.polymarket import PolymarketClient

async def on_fetch(request, env):
    try:
        # Parse the URL to get the path
        parsed_url = urlparse(request.url)
        path = parsed_url.path
        
        # Allow the route to be /markets or not specified at all
        if path and path != "/markets":
            return Response.new("Not Found", status=HTTPStatus.NOT_FOUND)
    except Exception as e:
        return Response.new(f"Error parsing URL: {str(e)}", status=HTTPStatus.BAD_REQUEST)
    
    # Extract API key from the request headers
    api_key = request.headers.get("Authorization")
    expected_api_key = env.API_KEY
    
    # Check if the API key is correct
    if not api_key or api_key != expected_api_key:
        return Response.new("Unauthorized", status=HTTPStatus.UNAUTHORIZED)
    try:
        # to much data - maybe we could write these to a durable object rather than an API call 
        # to reduce the amount of data being sent back and forth. The the cron job could read latest markets 
        # from the durable object and send it to the consumer.
        # drop the raw json into it

        console.log("Fetching Kalshi data...")
        kalshi_client = KalshiClient(env)
        markets = await kalshi_client.process_data()
        kalshi_markets_json = json.dumps(markets, cls=JsProxyEncoder)

        console.log("Fetching Polymarket data...")
        polymarket_client = PolymarketClient(env)
        markets = await polymarket_client.process_data()
        polymarket_markets_json = json.dumps(markets, cls=JsProxyEncoder)

        # Combine the data from both sources
        markets_json = []
        markets_json.extend(json.loads(kalshi_markets_json))
        markets_json.extend(json.loads(polymarket_markets_json))

        return Response.new(markets_json, status=HTTPStatus.OK)
    except Exception as e:
        console.log(f"Error: {str(e)}")
        return Response.new("An error occurred: " + str(e), status=HTTPStatus.INTERNAL_SERVER_ERROR)