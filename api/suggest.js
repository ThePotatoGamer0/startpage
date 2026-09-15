export default async function handler(req, res) {
    const { q, provider = 'startpage' } = req.query;

    if (!q) {
        return res.status(200).json([]);
    }

    let url = `https://www.startpage.com/osuggestions?q=${encodeURIComponent(q)}`;
    if (provider === 'google') {
        url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`;
    } else if (provider === 'duckduckgo') {
        url = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
    }

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json([]);
    }
}