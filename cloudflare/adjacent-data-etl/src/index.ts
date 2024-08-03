import { MappedMarket } from "./utils/types";

// polymarket
import PolymarketClient from "./markets/polymarket";

// kalshi
import KalshiClient from "./markets/kalshi";

export default {
	async scheduled(event, env, ctx): Promise<void> {
		ctx.waitUntil(handleScheduled(env));
	},
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		await handleScheduled(env);
		return new Response('OK', { status: 200 });
	},
} satisfies ExportedHandler<Env>;

async function handleScheduled(env) {
	// Extract data
	const sourceData = await extractData(env);

	console.log(`Processed ${sourceData.length} markets`)

	// Assuming sourceData is an array of markets
	const chunkSize = 50; // Adjust based on your data to keep message size under 128KB
	for (let i = 0; i < sourceData.length; i += chunkSize) {
		const chunk = sourceData.slice(i, i + chunkSize);
		const sendResponse = await env.ADJACENT_QUEUE.send({
			body: chunk,
			contentType: "application/json",
		});
	}
}

async function extractData(env): Promise<any> {
	const allMarkets: MappedMarket[] = []

	// kalshi 
	const kalshi = new KalshiClient(env)
	const kalshiMarkets = await kalshi.processData(env)

	allMarkets.push(...kalshiMarkets)

	// polymarket
	const polymarket = new PolymarketClient()
	const polymarketMarkets = await polymarket.processData(env)

	allMarkets.push(...polymarketMarkets);

	return allMarkets;
}