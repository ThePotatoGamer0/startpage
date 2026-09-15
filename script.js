const providers = {
    startpage: { name: "Startpage", action: "https://www.startpage.com/sp/search", method: "POST", inputName: "query", icon: "https://cdn.simpleicons.org/startpage/white" },
    google: { name: "Google", action: "https://www.google.com/search", method: "GET", inputName: "q", icon: "https://cdn.simpleicons.org/google/white" },
    duckduckgo: { name: "DuckDuckGo", action: "https://duckduckgo.com/", method: "GET", inputName: "q", icon: "https://cdn.simpleicons.org/duckduckgo/white" },
    gemini: { name: "Gemini", action: "https://gemini.google.com/", method: "GET", inputName: "prompt", icon: "https://cdn.simpleicons.org/googlegemini/white" }
};

const toggleBtn = document.getElementById('providerToggle');
const dropdown = document.getElementById('providerDropdown');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const autocompleteOverlay = document.getElementById('autocompleteOverlay');
const activeIcon = document.getElementById('activeProviderIcon');

toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('show'); });
document.addEventListener('click', () => { if (dropdown.classList.contains('show')) dropdown.classList.remove('show'); });

function setActiveProvider(key) {
    const provider = providers[key] || providers['startpage'];
    searchForm.action = provider.action; searchForm.method = provider.method;
    searchInput.name = provider.inputName; activeIcon.src = provider.icon; activeIcon.alt = provider.name;
    fetchSuggestions(searchInput.value.trim(), searchInput.value);
}

dropdown.querySelectorAll('li').forEach(item => { item.addEventListener('click', (e) => { setActiveProvider(e.currentTarget.getAttribute('data-provider')); searchInput.focus(); }); });

const suggestionsDropdown = document.getElementById('suggestionsDropdown');
let suggestionDebounceTimer;
let currentSelectedIndex = -1;

async function fetchSuggestions(query, rawInput) {
    if (!query) { closeSuggestions(); return; }
    const rule = localStorage.getItem('sp_search_suggestions') || 'match';
    if (rule === 'disabled') { closeSuggestions(); return; }

    let providerToUse = rule;
    if (rule === 'match') {
        const currentAction = searchForm.action;
        if (currentAction.includes('google')) providerToUse = 'google';
        else if (currentAction.includes('duckduckgo')) providerToUse = 'duckduckgo';
        else if (currentAction.includes('startpage')) providerToUse = 'startpage';
        else { closeSuggestions(); return; } 
    }

    try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}&provider=${providerToUse}`);
        const data = await res.json();
        if (data && data.length > 1 && data[1].length > 0) renderSuggestions(data[1].slice(0, 8), rawInput); 
        else closeSuggestions();
    } catch (e) { closeSuggestions(); }
}

function renderSuggestions(suggestions, rawInput) {
    suggestionsDropdown.innerHTML = '';
    currentSelectedIndex = -1;
    autocompleteOverlay.value = ''; 
    
    if (suggestions.length > 0 && rawInput) {
        const validGhost = suggestions.find(s => s.toLowerCase().startsWith(rawInput.toLowerCase()) && s.toLowerCase() !== rawInput.toLowerCase());
        if (validGhost) autocompleteOverlay.value = rawInput + validGhost.substring(rawInput.length);
    }

    const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

    suggestions.forEach((text, index) => {
        const div = document.createElement('div'); div.className = 'suggestion-item'; div.innerHTML = `${iconSvg} <span>${text}</span>`;
        div.onclick = () => { searchInput.value = text; searchForm.requestSubmit(); };
        suggestionsDropdown.appendChild(div);
    });

    suggestionsDropdown.classList.add('show'); searchInput.classList.add('has-suggestions');
}

function closeSuggestions() {
    suggestionsDropdown.classList.remove('show'); searchInput.classList.remove('has-suggestions');
    autocompleteOverlay.value = ''; currentSelectedIndex = -1;
}

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && autocompleteOverlay.value && autocompleteOverlay.value !== searchInput.value) {
        e.preventDefault(); searchInput.value = autocompleteOverlay.value;
        const raw = searchInput.value; fetchSuggestions(raw.trim(), raw);
        return;
    }
    if (!suggestionsDropdown.classList.contains('show')) return;
    const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') { e.preventDefault(); currentSelectedIndex = (currentSelectedIndex + 1) % items.length; updateSuggestionSelection(items); } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); currentSelectedIndex = (currentSelectedIndex - 1 + items.length) % items.length; updateSuggestionSelection(items); }
});

function updateSuggestionSelection(items) {
    items.forEach(item => item.classList.remove('selected'));
    if (currentSelectedIndex >= 0) {
        const selected = items[currentSelectedIndex]; selected.classList.add('selected');
        searchInput.value = selected.querySelector('span').innerText; autocompleteOverlay.value = ''; 
    }
}

searchInput.addEventListener('input', (e) => {
    clearTimeout(suggestionDebounceTimer);
    const rawVal = e.target.value;
    if (autocompleteOverlay.value && !autocompleteOverlay.value.toLowerCase().startsWith(rawVal.toLowerCase())) autocompleteOverlay.value = '';
    const trimVal = rawVal.trim();
    if (!trimVal || trimVal.startsWith('!')) { closeSuggestions(); return; }
    suggestionDebounceTimer = setTimeout(() => fetchSuggestions(trimVal, rawVal), 150);
});

document.addEventListener('click', (e) => { if (!searchForm.contains(e.target)) closeSuggestions(); });

let originalSearchText = ""; let isErrorState = false;

function showConsoleError(errorMessage, originalQuery) {
    searchInput.classList.remove('loading'); searchInput.classList.add('error-state');
    originalSearchText = originalQuery; searchInput.value = errorMessage; isErrorState = true; searchInput.blur();
}

function restoreSearch() { if (isErrorState) { searchInput.classList.remove('error-state'); searchInput.value = originalSearchText; isErrorState = false; } }

searchInput.addEventListener('focus', restoreSearch); searchInput.addEventListener('click', restoreSearch);

async function checkUrlAndRedirect(url, originalQuery) {
    try {
        const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 3000); 
        const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) { showConsoleError(`[Console] Error ${response.status}: ${response.statusText || 'Not Found'}`, originalQuery); return; }
        window.location.href = url;
    } catch (error) {
        if (error.name === 'AbortError') { showConsoleError(`[Console] Error 522: Connection Timed Out`, originalQuery); return; }
        try { await fetch(url, { method: 'HEAD', mode: 'no-cors' }); window.location.href = url; } 
        catch (fallbackError) { showConsoleError(`[Console] Error: Host Unreachable or Connection Refused`, originalQuery); }
    }
}

if (!localStorage.getItem('sp_aliases')) {
    const defaultAliases = [
        { keyword: '!yt', url: 'https://youtube.com/results?search_query=%s' },
        { keyword: '!r', url: 'https://reddit.com/search?q=%s' },
        { keyword: '!g', url: 'https://github.com/search?q=%s' },
        { keyword: '!tw', url: 'https://twitch.tv/search?term=%s' }
    ];
    localStorage.setItem('sp_aliases', JSON.stringify(defaultAliases));
}

searchForm.addEventListener('submit', (e) => {
    const query = searchInput.value.trim();
    if (!query || isErrorState) { e.preventDefault(); return; }

    const aliases = JSON.parse(localStorage.getItem('sp_aliases') || '[]');
    const queryParts = query.split(' ');
    const firstWord = queryParts[0].toLowerCase();
    const matchedAlias = aliases.find(a => a.keyword.toLowerCase() === firstWord);
    
    if (matchedAlias) {
        e.preventDefault(); searchInput.classList.add('loading');
        let targetUrl = matchedAlias.url;
        const remainingQuery = queryParts.slice(1).join(' ');
        if (targetUrl.includes('%s')) targetUrl = targetUrl.replace('%s', encodeURIComponent(remainingQuery));
        window.location.href = targetUrl; return;
    }

    const hasProtocol = /^[a-zA-Z0-9+-.]+:\/\//i.test(query);
    const isLocal = /^(localhost|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/i.test(query);
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(query);

    if (hasProtocol || isLocal || isDomain) {
        e.preventDefault(); searchInput.classList.add('loading');
        const targetUrl = hasProtocol ? query : 'https://' + query;
        checkUrlAndRedirect(targetUrl, query);
    } else { searchInput.classList.add('loading'); }
});

function renderBookmarks() {
    const container = document.getElementById('bookmarksContainer'); container.innerHTML = ''; 
    for (let i = 1; i <= 8; i++) {
        const url = localStorage.getItem(`sp_bm${i}_url`) || ''; const icon = localStorage.getItem(`sp_bm${i}_icon`) || '';
        if (url.trim() !== '') {
            const finalUrl = url.startsWith('http') ? url : 'https://' + url;
            let domain = url; try { domain = new URL(finalUrl).hostname; } catch(e) {}
            const finalIcon = icon.trim() !== '' ? icon : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            const a = document.createElement('a'); a.href = finalUrl; a.className = 'bookmark-item';
            const img = document.createElement('img'); img.src = finalIcon; img.alt = domain;
            img.onerror = function() { this.src = 'chrome://branding/content/about-logo.png'; };
            a.appendChild(img); container.appendChild(a);
        }
    }
}

const bg1 = document.getElementById('bg1'); const bg2 = document.getElementById('bg2');
let activeBg = 1;
let customBgPollTimer = null;

function updateBackground(url) {
    if (!url) return;
    if (activeBg === 1) {
        bg2.style.backgroundImage = `url('${url}')`; bg2.classList.add('active'); bg1.classList.remove('active'); activeBg = 2;
    } else {
        bg1.style.backgroundImage = `url('${url}')`; bg1.classList.add('active'); bg2.classList.remove('active'); activeBg = 1;
    }
}

async function pollAndApplyCustomWallpaper(url, isPolled) {
    const timeParam = isPolled ? (url.includes('?') ? '&' : '?') + `t=${new Date().getTime()}` : '';
    const fetchUrl = url + timeParam;
    let finalImageUrl = fetchUrl;

    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(fetchUrl)}`;
        const res = await fetch(proxyUrl, { headers: { 'Accept': 'application/json, image/*, */*' } });
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            
            const findUrl = (obj) => {
                let fallback = null;
                const search = (node) => {
                    if (typeof node === 'string' && node.startsWith('http')) {
                        if (node.match(/\.(jpeg|jpg|gif|png|webp)/i)) return node;
                        if (!fallback) fallback = node; 
                    }
                    if (typeof node === 'object' && node !== null) {
                        for (let k of ['url', 'file', 'message', 'link', 'image']) {
                            if (typeof node[k] === 'string' && node[k].startsWith('http')) return node[k];
                        }
                        for (let k in node) {
                            let res = search(node[k]);
                            if (res) return res;
                        }
                    }
                    return null;
                };
                return search(obj) || fallback;
            };
            
            const extracted = findUrl(data);
            if (extracted) finalImageUrl = extracted;
        }
    } catch (e) {
        console.warn("Smart fetch failed, trying direct CSS injection...", e);
    }

    updateBackground(finalImageUrl);
}

const mainLogo = document.getElementById('mainLogo');

function loadSettings() {
    const savedProvider = localStorage.getItem('sp_provider') || 'startpage';
    const savedBlur = localStorage.getItem('sp_blur') || '0';
    const savedLogo = localStorage.getItem('sp_logo') || 'chrome://branding/content/about-logo.png';

    setActiveProvider(savedProvider);
    bg1.style.filter = `blur(${savedBlur}px)`; bg2.style.filter = `blur(${savedBlur}px)`;
    mainLogo.src = savedLogo;

    renderBookmarks();

    const customUrl = localStorage.getItem('sp_bg_url') || '';
    const pollBg = localStorage.getItem('sp_bg_poll') === 'true';
    const pollInterval = parseInt(localStorage.getItem('sp_bg_poll_interval')) || 60;

    if (customUrl) {
        pollAndApplyCustomWallpaper(customUrl, pollBg);

        if (pollBg && pollInterval > 0) {
            clearInterval(customBgPollTimer);
            customBgPollTimer = setInterval(() => {
                pollAndApplyCustomWallpaper(customUrl, true);
            }, pollInterval * 1000);
        }
    } else {
        updateBackground(`firefox_bg.jpg`); // Optional fallback background
    }
}

function forceFocus() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.classList.remove('loading'); searchInput.focus(); setTimeout(() => searchInput.focus(), 50); }
}

window.addEventListener('load', forceFocus);
window.addEventListener('focus', forceFocus);

loadSettings();