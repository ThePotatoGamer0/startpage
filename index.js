export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 1. Handle CORS preflight options requests for the API
        if (path.startsWith('/api/') && request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
                },
            });
        }

        // 2. Route: POST /api/export
        if (path === '/api/export' && request.method === 'POST') {
            try {
                const body = await request.json();
                const rawData = body.data !== undefined ? body.data : body;
                const payload = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

                if (!payload) {
                    return new Response(JSON.stringify({ error: 'Missing configuration data' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                let shortId = body.key || body.customKey;

                if (shortId) {
                    const clientSecret = request.headers.get('X-Admin-Secret');
                    if (!env.ADMIN_SECRET || clientSecret !== env.ADMIN_SECRET) {
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 403,
                            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                        });
                    }
                } else {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    shortId = '';
                    const randomValues = new Uint8Array(6);
                    crypto.getRandomValues(randomValues);
                    for (let i = 0; i < 6; i++) {
                        shortId += chars[randomValues[i] % chars.length];
                    }
                }

                await env.STARTPAGE_KV.put(shortId, payload, { expirationTtl: 5184000 });

                return new Response(JSON.stringify({ id: shortId }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // 3. Route: GET /api/import
        if (path === '/api/import' && request.method === 'GET') {
            try {
                const id = url.searchParams.get('id');

            if (!id) {
                    return new Response(JSON.stringify({ error: 'Missing setup ID' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                const data = await env.STARTPAGE_KV.get(id);

                if (!data) {
                    return new Response(JSON.stringify({ error: 'Setup configuration not found or expired' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                return new Response(data, {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // 4. For everything else (HTML, CSS, JS, images), serve your static website files!
        return env.ASSETS.fetch(request);
    }
};