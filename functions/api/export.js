export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
        },
    });
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
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