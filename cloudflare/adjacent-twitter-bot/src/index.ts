import Twitter from './twitter';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

export interface Env {
    HYPERDRIVE: Hyperdrive;
}

export interface Env {
    TWITTER_BEARER_TOKEN: string;
    TWITTER_CONSUMER_API_KEY: string;
    TWITTER_CONSUMER_API_SECRET: string;
    TWITTER_ACCESS_TOKEN: string;
    TWITTER_ACCESS_TOKEN_SECRET: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

const hiraganaStart = 0x3041;
const hiraganaEnd = 0x3096;

// function getRandomHiragana(len: number): string {
//     let result = '';
//     for (let i = 0; i < len; i++) {
//         const randomCode = Math.floor(Math.random() * (hiraganaEnd - hiraganaStart + 1)) + hiraganaStart;
//         result += String.fromCharCode(randomCode);
//     }

//     return result;
// }

async function getRelatedMarkets(env, item) {
  const supabase = createClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
  );

  if (item && item.embedding_json && item.embedding_json.embedding) {
    return supabase.rpc('match_documents', {
      query_embedding: item.embedding_json.embedding, // pass the query embedding
      match_threshold: 0.803, // choose an appropriate threshold for your data
      match_count: 3, // choose the number of matches
    }).then(({ data: documents }) => {
      return documents;
    }).catch(error => {
      console.error(error);
      return [];
    });
  } else {
    return Promise.resolve([]);
  }
}

async function getItem(env): Promise<Response> {
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });

    try {
        await client.connect();
        let queryText = `SELECT id, embedding_json, title 
            FROM item 
            WHERE feed_id IN (
                'clyf4a0ok0006w2vweefmfps8',
                'clyf4a2vi0007w2vwsocz81kt',
                'clyf493z80002w2vw3w7uag0j',
                'clyf490pn0001w2vwxr07cwn2',
                'clyc8a9eq0000hb7wfdpuifvl',
                'clyc8moo50001hb7w1f5brelz'
            )
            ORDER BY created_at DESC 
            LIMIT 50;`;
        let result = await client.query(queryText);

        const items = result.rows;
        
        // iterate through the items and get the related markets
        // on the first item with a related market return the response and stop iteration
        // console.log(items)
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const relatedMarkets = await getRelatedMarkets(env, item);
            if (relatedMarkets.length > 0) {
                return new Response(JSON.stringify({ item: item, relatedMarkets: relatedMarkets }), { status: 200 });
            }
        }

        return new Response(JSON.stringify({ result: result.rows }), { status: 200 });
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    } finally {
        await client.end();
    }
}

async function post(env: Env) {
    const twitter = new Twitter(
        env.TWITTER_CONSUMER_API_KEY,
        env.TWITTER_CONSUMER_API_SECRET,
        env.TWITTER_ACCESS_TOKEN,
        env.TWITTER_ACCESS_TOKEN_SECRET
    );

    const response = await getItem(env);
    const data = await response.json();
    const item = data.item;
    const relatedMarkets = data.relatedMarkets;

    console.log(`https://adj.news/reader?item=${item.id}`)

    return twitter.post(
        `[ADJ] ${item.title} https://adj.news/reader?item=${item.id}`,
    );
}

export default {
    // If you remove the comment out, you can check if the post is working by accessing the URL.
    //
    // async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    //     const response = await post(env);
    //     return new Response(JSON.stringify({ status: response.status, message: response.statusText }), {
    //         headers: { 'Content-Type': 'application/json' },
    //     });
    // },

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(post(env));
    },
};
