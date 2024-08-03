/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// local development
// interface Market {
// 	ticker: string;
// 	adj_ticker: string;
// 	market_type: string;
// 	reported_date: string;
// 	end_date: string;
// 	market_slug: string;
// 	open_interest: number;
// 	volume: number;
// 	liquidity: number;
// 	probability: number;
// 	question: string;
// 	description: string;
// 	rules: string;
// 	forecasts?: number | null;
// 	result: string;
// 	link: string;
// 	category: string;
// 	status: string;
// 	platform: string;
// }

export default {
	async scheduled(event, env, ctx): Promise<void> {
		ctx.waitUntil(handleScheduled(env));
	},
	// local development
	// async queue(batch, env): Promise<void> {
	// 	// A queue consumer can make requests to other endpoints on the Internet,
	// 	// write to R2 object storage, query a D1 Database, and much more.
	// 	for (let message of batch.messages) {
	// 		const markets: Market[] = message.body.body;
			
	// 		// query the database with the adj_ticker to see if it needs to be inserted or updated
	// 		const insertMarketsArray: Market[] = [];
	// 		const updateMarketsArray: Market[] = [];

	// 		// First, determine which markets need to be inserted or updated
	// 		for (const market of markets) {
	// 			const queryResponse = await queryMarket(market, env);
	// 			if (queryResponse.length === 0) {
	// 				insertMarketsArray.push(market);
	// 			} else {
	// 				updateMarketsArray.push(market);
	// 			}
	// 		}

	// 		// console.log(insertMarketsArray.length, updateMarketsArray.length);

	// 		// Now, perform the insert and update operations in bulk
	// 		if (insertMarketsArray.length > 0) {
	// 			const insertResponse = await insertMarket(insertMarketsArray, env);
	// 			if (insertResponse.status === 201) {
	// 				// insertMarketsArray.forEach(market => console.log(`Inserted market new ${market.adj_ticker}`));
	// 				message.ack();
	// 			} else {
	// 				console.error(`Failed to insert markets from message ${message.id}`);
	// 			}
	// 		}

	// 		if (updateMarketsArray.length > 0) {
	// 			const updateResponse = await updateMarkets(updateMarketsArray, env);
	// 			if (updateResponse.every(code => code === 204)) {
	// 				// updateMarketsArray.forEach(market => console.log(`Updated market ${market.adj_ticker}`));
	// 				message.ack();
	// 			} else {
	// 				console.error(`Failed to update markets from message ${message.id}`);
	// 			}
	// 		}
	// 	}

	// 	console.log(`Processed ${batch.messages.length} messages in the queue`);
	// }
} satisfies ExportedHandler<Env>;

async function handleScheduled(env) {
	// Extract data
	const sourceData = await extractData(env.API_KEY);

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

async function extractData(apiKey: string): Promise<any> {
    const headers = {
        "Authorization": apiKey,
        "Content-Type": "application/json",
        // Example CORS headers, adjust as necessary
        "Access-Control-Allow-Origin": "*"
    };

	const response = await fetch("https://adjacent-data-etl.kohorstlucas.workers.dev/markets", {
		method: "GET",
		headers: headers
	});

	if (!response.ok) {
		throw new Error(`HTTP error, status: ${response.status}`);
	}

	return await response.json();
}

// local development

// async function queryMarket(market: Market, env): Promise<any> {
//     const response = await fetch(`${env.SUPABASE_URL}/rest/v1/markets_data?adj_ticker=eq.${market.adj_ticker}`, {
//         method: 'GET',
//         headers: {
//             "apikey": env.SUPABASE_ANON_KEY,
//             "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
//         }
//     });
//     return response.json();
// }

// async function insertMarket(marketData: Market[], env): Promise<any> {
//     const requestUrl = `${env.SUPABASE_URL}/rest/v1/markets_data`;
//     const requestOptions = {
//         method: 'POST',
//         headers: {
//             "apikey": env.SUPABASE_ANON_KEY,
//             "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify(marketData)
//     };

//     const response = await fetch(requestUrl, requestOptions);

// 	if (!response.ok) {
// 		throw new Error(`HTTP error, status: ${response.status}`);
// 	}
	
// 	return response.status;
// }

// async function updateMarkets(marketDataArray: any[], env): Promise<any[]> {
//     const updatePromises = marketDataArray.map(marketData => {
//         const marketId = marketData.adj_ticker;
//         const url = `${env.SUPABASE_URL}/rest/v1/markets_data?adj_ticker=eq.${marketId}`;
//         const requestOptions = {
//             method: 'PATCH',
//             headers: {
//                 "apikey": env.SUPABASE_ANON_KEY,
//                 "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify(marketData)
//         };

//         return fetch(url, requestOptions).then(response => {
//             return response.status;
//         }).catch(error => {
//             throw error; 
//         });
//     });

//     return Promise.all(updatePromises);
// }