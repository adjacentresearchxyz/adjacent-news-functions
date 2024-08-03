interface Market {
	ticker: string;
	adj_ticker: string;
	market_type: string;
	reported_date: string;
	end_date: string;
	market_slug: string;
	open_interest: number;
	volume: number;
	liquidity: number;
	probability: number;
	question: string;
	description: string;
	rules: string;
	forecasts?: number | null;
	result: string;
	link: string;
	category: string;
	status: string;
	platform: string;
	question_embedding: any;
}

export default {
	// The queue handler is invoked when a batch of messages is ready to be delivered
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch, env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		let marketsUpdated = 0;
		let marketsInserted = 0;
		for (let message of batch.messages) {
			const markets: Market[] = Array.isArray(message.body) ? message.body : (message.body.body || []);

			// query the database with the adj_ticker to see if it needs to be inserted or updated
			let insertMarketsArray: Market[] = [];
			const updateMarketsArray: Market[] = [];

			// First, determine which markets need to be inserted or updated
			for (const market of markets) {
				const queryResponse = await queryMarket(market, env);
				if (queryResponse.length === 0) {
					insertMarketsArray.push(market);
				} else {
					updateMarketsArray.push(market);
				}
			}

			// Now, perform the insert and update operations in bulk
			if (insertMarketsArray.length > 0) {
				// Generate embeddings for new markets
				const embeddingsPromises = insertMarketsArray.map(async (market) => {
					const response = await fetch(`${env.SUPABASE_URL}/functions/v1/embed`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ input: market.question })
					});

					if (!response.ok) {
						console.error(`Failed to generate embedding for market ${market.adj_ticker}`);
						return null;
					}

					const embedding = await response.json();
					return { ...market, question_embedding: embedding.embedding };
				});

				const marketsWithEmbeddings = await Promise.all(embeddingsPromises);
				const validMarketsWithEmbeddings = marketsWithEmbeddings.filter(market => market !== null);

				// Update insertMarketsArray with the embeddings
				insertMarketsArray = validMarketsWithEmbeddings;
				
				const insertResponse = await insertMarket(insertMarketsArray, env);
				if (insertResponse.status === 201) {
					// insertMarketsArray.forEach(market => console.log(`Inserted market new ${market.adj_ticker}`));
					message.ack();
					marketsInserted += insertMarketsArray.length;
				} else {
					console.error(`Failed to insert markets from message ${message.id}, status: ${insertResponse.status}, market: ${JSON.stringify(insertMarketsArray[0])}`);
					message.retry();
				}
			}

			if (updateMarketsArray.length > 0) {
				const updateResponse = await updateMarkets(updateMarketsArray, env);
				if (updateResponse.every(code => code === 204)) {
					// updateMarketsArray.forEach(market => console.log(`Updated market ${market.adj_ticker}`));
					message.ack();
					marketsUpdated += updateMarketsArray.length;
				} else {
					console.error(`Failed to update markets from message ${message.id}, status: ${updateResponse}, market: ${updateMarketsArray[0]}`);
					message.retry();
				}
			}
		}

		console.log(`Processed ${batch.messages.length} messages in the queue. Inserted ${marketsInserted} markets and updated ${marketsUpdated} markets.`);
	},
} satisfies ExportedHandler<Env, Error>;

async function queryMarket(market: Market, env): Promise<any> {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/markets_data?adj_ticker=eq.${market.adj_ticker}`, {
        method: 'GET',
        headers: {
            "apikey": env.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
        }
    });
    return response.json();
}

async function insertMarket(marketData: Market[], env): Promise<any> {
    const requestUrl = `${env.SUPABASE_URL}/rest/v1/markets_data`;
    const requestOptions = {
        method: 'POST',
        headers: {
            "apikey": `${env.SUPABASE_ANON_KEY}`,
            "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(marketData)
    };

    const response = await fetch(requestUrl, requestOptions);

	if (!response.ok) {
		throw new Error(`HTTP error, status: ${response.status}`);
	}
	
	return response.status;
}

async function updateMarkets(marketDataArray: any[], env): Promise<any[]> {
    const updatePromises = marketDataArray.map(marketData => {
        const marketId = marketData.adj_ticker;
        const url = `${env.SUPABASE_URL}/rest/v1/markets_data?adj_ticker=eq.${marketId}`;
        const requestOptions = {
            method: 'PATCH',
            headers: {
                "apikey": env.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(marketData)
        };

        return fetch(url, requestOptions).then(response => {
            return response.status;
        }).catch(error => {
            throw error; 
        });
    });

    return Promise.all(updatePromises);
}