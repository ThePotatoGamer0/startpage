import { Kawarp } from 'https://cdn.jsdelivr.net/npm/@kawarp/core@1/+esm';

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

// --- Background Logic ---
const bg1 = document.getElementById('bg1'); 
const bg2 = document.getElementById('bg2');
const bgCanvas = document.getElementById('bg-canvas');
let activeBg = 1;
let customBgPollTimer = null;
let kawarpInstance = null;

async function updateBackground(url) {
    if (!url) return;
    const enableWarp = localStorage.getItem('sp_bg_warp') === 'true';

    if (enableWarp) {
        if (!kawarpInstance) {
            kawarpInstance = new Kawarp(bgCanvas);
            kawarpInstance.start(); 
        }
        
        bg1.classList.remove('active');
        bg2.classList.remove('active');
        bgCanvas.classList.add('active');
        
        try {
            await kawarpInstance.loadImage(url); 
        } catch (error) {
            console.error("Kawarp failed to load image:", error);
        }
    } else {
        if (kawarpInstance) {
            kawarpInstance.stop();
            kawarpInstance.dispose();
            kawarpInstance = null;
        }
        
        bgCanvas.classList.remove('active');
        
        if (activeBg === 1) {
            bg2.style.backgroundImage = `url('${url}')`; bg2.classList.add('active'); bg1.classList.remove('active'); activeBg = 2;
        } else {
            bg1.style.backgroundImage = `url('${url}')`; bg1.classList.add('active'); bg2.classList.remove('active'); activeBg = 1;
        }
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

    updateBackground(finalImageUrl.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(finalImageUrl)}` : finalImageUrl);
}

// --- Browser Detection Logic ---
async function detectBrowser() {
    const ua = navigator.userAgent;
    let brands = [];
    
    if (navigator.userAgentData && navigator.userAgentData.brands) {
        brands = navigator.userAgentData.brands.map(b => b.brand);
    }

    if (brands.includes("Vivaldi") || window.vivaldi) {
        return { name: "Vivaldi", logo: "browserlogos/vivaldi.svg" };
    }
    if (navigator.brave && await navigator.brave.isBrave()) {
        return { name: "Brave", logo: "browserlogos/brave.svg" };
    }
    if (ua.includes("Firefox") || ua.includes("FxiOS") || ua.includes("LibreWolf")) {
        return { name: "Firefox", logo: "chrome://branding/content/about-logo.png" };
    }
    if (ua.includes("Edition GX") || ua.includes("OPRGX")) {
        return { name: "Opera GX", logo: "browserlogos/opera-gx.svg" };
    }
    if (ua.includes("OPR/") || ua.includes("Opera") || brands.includes("Opera")) {
        return { name: "Opera", logo: "browserlogos/opera.svg" };
    }
    if (ua.includes("Edg/") || brands.includes("Microsoft Edge")) {
        return { name: "Microsoft Edge", logo: "browserlogos/edge.svg" };
    }
    if (ua.includes("SamsungBrowser") || brands.includes("Samsung Internet")) {
        return { name: "Samsung Internet", logo: "browserlogos/samsung-internet.svg" };
    }
    if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")) {
        return { name: "Safari", logo: "browserlogos/safari.svg" };
    }
    if (brands.includes("Google Chrome") || ua.includes("Chrome")) {
        return { name: "Google Chrome", logo: "browserlogos/chrome.svg" };
    }
    if (brands.includes("Chromium")) {
        return { name: "Chromium", logo: "browserlogos/chromium.svg" };
    }
    
    return { name: "Chromium Browser", logo: "browserlogos/chromium.svg" };
}

const mainLogo = document.getElementById('mainLogo');

async function loadSettings() {
    // Check if onboarding has been completed
    if (!localStorage.getItem('sp_onboarding_complete')) {
        initOnboarding();
        return;
    }

    const savedProvider = localStorage.getItem('sp_provider') || 'startpage';
    const savedBlur = localStorage.getItem('sp_blur') || '0';
    let savedLogo = localStorage.getItem('sp_logo');
    
    if (!savedLogo) {
        const detected = await detectBrowser();
        savedLogo = detected.logo;
    }

    setActiveProvider(savedProvider);
    bg1.style.filter = `blur(${savedBlur}px)`; bg2.style.filter = `blur(${savedBlur}px)`;
    bgCanvas.style.filter = `blur(${savedBlur}px)`;
    mainLogo.src = savedLogo;

    renderBookmarks();

    const customUrl = localStorage.getItem('sp_bg_url') || '';
    if (customUrl) {
        updateBackground(customUrl);
    } else {
        const defaultWallpaper = window.location.origin + '/wallpaper.png';
        updateBackground(defaultWallpaper); 
    }
}

// --- Onboarding Wizard Logic ---
async function initOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    const step1 = document.getElementById('obStep1');
    const step2 = document.getElementById('obStep2');
    const step3 = document.getElementById('obStep3');

    const browserNameEl = document.getElementById('obBrowserName');
    const browserLogoEl = document.getElementById('obBrowserLogo');
    const browserSelect = document.getElementById('obBrowserSelect');
    const customUrlWrapper = document.getElementById('obCustomUrlWrapper');
    
    const detected = await detectBrowser();
    browserNameEl.innerText = detected.name;
    browserLogoEl.src = detected.logo;
    let chosenLogo = detected.logo;

    overlay.classList.add('show');

    // Handle dropdown changes
    browserSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            customUrlWrapper.style.display = 'block';
        } else {
            customUrlWrapper.style.display = 'none';
            browserLogoEl.src = val; // Preview it immediately
            chosenLogo = val;
        }
    });

    // Step 1 buttons
    document.getElementById('obBtnYes').onclick = () => {
        localStorage.setItem('sp_logo', chosenLogo);
        step1.classList.remove('active');
        step2.classList.add('active');
        updateBackground(window.location.origin + '/wallpaper.png');
    };

    document.getElementById('obBtnNo').onclick = () => {
        document.getElementById('obBrowserPromptText').style.display = 'none';
        document.getElementById('obStep1Actions').style.display = 'none';
        document.getElementById('obBrowserManual').style.display = 'block';
        
        // Try to pre-select the correct dropdown option if it matches our detected one
        const options = Array.from(browserSelect.options);
        const match = options.find(opt => opt.value === chosenLogo);
        if (match) browserSelect.value = chosenLogo;
    };

    document.getElementById('obBtnSaveCustomLogo').onclick = () => {
        if (browserSelect.value === 'custom') {
            const customUrl = document.getElementById('obCustomLogoUrl').value.trim();
            if (customUrl) chosenLogo = customUrl;
        }
        localStorage.setItem('sp_logo', chosenLogo);
        step1.classList.remove('active');
        step2.classList.add('active');
        updateBackground(window.location.origin + '/wallpaper.png');
    };

    // Step 2 buttons
    document.getElementById('obBtnBack1').onclick = () => {
        step2.classList.remove('active');
        step1.classList.add('active');
    };

    document.getElementById('obBtnNext2').onclick = () => {
        const bgUrl = document.getElementById('obWallpaperUrl').value.trim();
        const enableWarp = document.getElementById('obWarpToggle').checked;

        localStorage.setItem('sp_bg_warp', enableWarp);
        if (bgUrl) {
            localStorage.setItem('sp_bg_url', bgUrl);
            updateBackground(bgUrl);
        } else {
            updateBackground(window.location.origin + '/wallpaper.png');
        }

        step2.classList.remove('active');
        step3.classList.add('active');
    };

    // Step 3 buttons
    document.getElementById('obBtnBack2').onclick = () => {
        step3.classList.remove('active');
        step2.classList.add('active');
    };

    document.getElementById('obBtnFinish').onclick = () => {
        const bm1 = document.getElementById('obBm1').value.trim();
        const bm2 = document.getElementById('obBm2').value.trim();
        const bm3 = document.getElementById('obBm3').value.trim();

        if (bm1) localStorage.setItem('sp_bm1_url', bm1);
        if (bm2) localStorage.setItem('sp_bm2_url', bm2);
        if (bm3) localStorage.setItem('sp_bm3_url', bm3);

        localStorage.setItem('sp_onboarding_complete', 'true');
        overlay.classList.remove('show');
        loadSettings();
    };
}

function forceFocus() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.classList.remove('loading'); searchInput.focus(); setTimeout(() => searchInput.focus(), 50); }
}

window.addEventListener('load', forceFocus);
window.addEventListener('focus', forceFocus);

loadSettings();