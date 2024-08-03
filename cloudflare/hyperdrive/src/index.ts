import { Client } from 'pg';
import { URL } from 'url';

export interface Env {
    HYPERDRIVE: Hyperdrive;
}

export default {
    async fetch(request: Request, env: Env, ctx): Promise<Response> {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
        }

        const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });

        try {
            await client.connect();
            let queryText = 'SELECT * FROM item WHERE id = $1';
            let result = await client.query(queryText, [id]);

            return new Response(JSON.stringify({ result: result.rows }), { status: 200 });
        } catch (e) {
            console.log(e);
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        } finally {
            await client.end();
        }
    },
} satisfies ExportedHandler<Env>;