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

// --- Widget Logic ---

const editWidgetsBtn = document.getElementById('editWidgetsBtn');
const clockWidgetWindow = document.getElementById('clockWidgetWindow');
const clockWidgetContent = document.getElementById('clockWidgetContent');

editWidgetsBtn.addEventListener('click', () => {
    document.body.classList.toggle('widget-edit-mode');
});

document.addEventListener('widget-updated', (e) => {
    if (e.detail.id === 'clockWidgetWindow') {
        const config = JSON.parse(localStorage.getItem('sp_widget_clock_config') || '{}');
        config.xRatio = e.detail.xRatio;
        config.yRatio = e.detail.yRatio;
        delete config.x; // clean up old absolute pixel property if present
        delete config.y;
        localStorage.setItem('sp_widget_clock_config', JSON.stringify(config));
    }
});

function loadWidgetSettings() {
    const isWidgetsEnabled = localStorage.getItem('sp_widgets_enabled') !== 'false';
    
    if (!isWidgetsEnabled) {
        clockWidgetWindow.style.display = 'none';
        return;
    }

    clockWidgetWindow.style.display = 'block';

    const defaultClockConfig = { xRatio: 0.05, yRatio: 0.05, timeformat: '24' };
    const clockConfigString = localStorage.getItem('sp_widget_clock_config');
    const clockConfig = clockConfigString ? JSON.parse(clockConfigString) : defaultClockConfig;

    if (clockConfig.xRatio !== undefined) clockWidgetWindow.setAttribute('x-ratio', clockConfig.xRatio);
    if (clockConfig.yRatio !== undefined) clockWidgetWindow.setAttribute('y-ratio', clockConfig.yRatio);
    if (clockConfig.timeformat) clockWidgetContent.setAttribute('timeformat', clockConfig.timeformat);
}


// --- Validation Logic ---
function showError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add('error');
    let errDiv = document.getElementById(elementId + '-err');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = elementId + '-err';
        errDiv.className = 'error-text';
        el.parentNode.insertBefore(errDiv, el.nextSibling);
    }
    errDiv.innerText = msg;
    errDiv.style.display = 'block';
}

function clearError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.remove('error');
    const errDiv = document.getElementById(elementId + '-err');
    if (errDiv) errDiv.style.display = 'none';
}

document.addEventListener('input', (e) => {
    if (e.target.classList && e.target.classList.contains('error')) {
        clearError(e.target.id);
    }
});

async function validateUrlInput(url, type) {
    if (!url) return { valid: true };

    let parsedUrl;
    try {
        parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
        return { valid: false, msg: "That doesn't look like a valid link! Check for typos." };
    }

    if (!parsedUrl.hostname.includes('.') || parsedUrl.hostname.endsWith('.')) {
        return { valid: false, msg: "That link is missing a valid domain (like .com or .net)!" };
    }

    if (type === 'link') {
        return { valid: true };
    }

    if (type === 'wallpaper') {
        try {
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(parsedUrl.href)}`);
            if (res.status === 404) return { valid: false, msg: "That url leads to nothing! Did you make a typo?" };
            if (res.status >= 400) return { valid: false, msg: "That website blocked Startpage from grabbing that wallpaper! Try a different site..." };
            
            const contentType = res.headers.get('content-type');
            if (contentType && !contentType.includes('image') && !contentType.includes('json')) {
                return { valid: false, msg: "That link doesn't seem to point to an image!" };
            }
            return { valid: true };
        } catch (e) {
            return { valid: false, msg: "That website blocked Startpage from grabbing that wallpaper! Try a different site..." };
        }
    }
    
    if (type === 'logo' || type === 'icon') {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ valid: true });
            img.onerror = () => resolve({ valid: false, msg: `That url leads to nothing or the image is broken! Did you make a typo?` });
            img.src = parsedUrl.href;
        });
    }

    return { valid: true };
}


// --- Background Logic ---
const bg1 = document.getElementById('bg1'); 
const bg2 = document.getElementById('bg2');
const bgCanvas = document.getElementById('bg-canvas');
let activeBg = 1;
let customBgPollTimer = null;
let kawarpInstance = null;

function debouncePreview(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function updateBackground(rawUrl, forceWarp = null) {
    if (!rawUrl) return;

    let url = rawUrl;
    if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
        if (!url.includes('/api/proxy?url=')) { 
            url = `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
        }
    }

    const enableWarp = forceWarp !== null ? forceWarp : (localStorage.getItem('sp_bg_warp') === 'true');

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

    updateBackground(finalImageUrl);
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
    loadWidgetSettings(); 

    const customUrl = localStorage.getItem('sp_bg_url') || '';
    const pollBg = localStorage.getItem('sp_bg_poll') === 'true';
    const pollInterval = parseInt(localStorage.getItem('sp_bg_poll_interval')) || 60;

    if (customUrl) {
        if (pollBg) {
            pollAndApplyCustomWallpaper(customUrl, true);
            if (pollInterval > 0) {
                clearInterval(customBgPollTimer);
                customBgPollTimer = setInterval(() => {
                    pollAndApplyCustomWallpaper(customUrl, true);
                }, pollInterval * 1000);
            }
        } else {
            updateBackground(customUrl);
        }
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
    
    const obBlurInput = document.getElementById('obBlurInput');
    const obWallpaperUrl = document.getElementById('obWallpaperUrl');
    const obWarpToggle = document.getElementById('obWarpToggle');
    
    updateBackground(window.location.origin + '/wallpaper.png');
    
    const detected = await detectBrowser();
    browserNameEl.innerText = detected.name;
    browserLogoEl.src = detected.logo;
    let chosenLogo = detected.logo;

    overlay.classList.add('show');

    browserSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            customUrlWrapper.style.display = 'block';
        } else {
            customUrlWrapper.style.display = 'none';
            browserLogoEl.src = val; 
            chosenLogo = val;
        }
    });

    obBlurInput.addEventListener('input', (e) => {
        const blurValue = e.target.value || '0';
        bg1.style.filter = `blur(${blurValue}px)`;
        bg2.style.filter = `blur(${blurValue}px)`;
        bgCanvas.style.filter = `blur(${blurValue}px)`;
    });

    const updatePreview = async () => {
        const bgUrl = obWallpaperUrl.value.trim();
        const enableWarp = obWarpToggle.checked;

        if (bgUrl) {
            const check = await validateUrlInput(bgUrl, 'wallpaper');
            if (!check.valid) {
                showError('obWallpaperUrl', check.msg);
                return;
            }
            clearError('obWallpaperUrl');
        } else {
            clearError('obWallpaperUrl');
        }

        updateBackground(bgUrl || (window.location.origin + '/wallpaper.png'), enableWarp);
    };

    obWallpaperUrl.addEventListener('input', debouncePreview(updatePreview, 600));
    obWarpToggle.addEventListener('change', updatePreview);

    document.getElementById('obBtnYes').onclick = () => {
        localStorage.setItem('sp_logo', chosenLogo);
        step1.classList.remove('active');
        step2.classList.add('active');
        overlay.classList.add('preview-mode');
    };

    document.getElementById('obBtnNo').onclick = () => {
        document.getElementById('obBrowserPromptText').style.display = 'none';
        document.getElementById('obStep1Actions').style.display = 'none';
        document.getElementById('obBrowserManual').style.display = 'block';
        
        const options = Array.from(browserSelect.options);
        const match = options.find(opt => opt.value === chosenLogo);
        if (match) browserSelect.value = chosenLogo;
    };

    document.getElementById('obBtnSaveCustomLogo').onclick = async () => {
        const btn = document.getElementById('obBtnSaveCustomLogo');
        if (browserSelect.value === 'custom') {
            const customUrl = document.getElementById('obCustomLogoUrl').value.trim();
            if (customUrl) {
                const orig = btn.innerText;
                btn.innerText = "Checking...";
                const check = await validateUrlInput(customUrl, 'logo');
                btn.innerText = orig;
                if (!check.valid) {
                    showError('obCustomLogoUrl', check.msg);
                    return;
                }
                chosenLogo = customUrl;
            }
        }
        localStorage.setItem('sp_logo', chosenLogo);
        step1.classList.remove('active');
        step2.classList.add('active');
        overlay.classList.add('preview-mode');
    };

    document.getElementById('obBtnBack1').onclick = () => {
        step2.classList.remove('active');
        step1.classList.add('active');
        overlay.classList.remove('preview-mode');
    };

    document.getElementById('obBtnNext2').onclick = async () => {
        const bgUrl = obWallpaperUrl.value.trim();
        const enableWarp = obWarpToggle.checked;
        const blurVal = obBlurInput.value || '0';

        if (bgUrl) {
            const btn = document.getElementById('obBtnNext2');
            const orig = btn.innerText;
            btn.innerText = "Checking...";
            const check = await validateUrlInput(bgUrl, 'wallpaper');
            btn.innerText = orig;
            if (!check.valid) {
                showError('obWallpaperUrl', check.msg);
                return;
            }
            localStorage.setItem('sp_bg_url', bgUrl);
        } else {
            localStorage.removeItem('sp_bg_url');
        }

        localStorage.setItem('sp_bg_warp', enableWarp);
        localStorage.setItem('sp_blur', blurVal);

        updateBackground(bgUrl || (window.location.origin + '/wallpaper.png'));

        step2.classList.remove('active');
        step3.classList.add('active');
        overlay.classList.remove('preview-mode');
    };

    document.getElementById('obBtnBack2').onclick = () => {
        step3.classList.remove('active');
        step2.classList.add('active');
        overlay.classList.add('preview-mode');
    };

    document.getElementById('obBtnFinish').onclick = async () => {
        const bms = ['obBm1', 'obBm2', 'obBm3'];
        let hasError = false;

        const btn = document.getElementById('obBtnFinish');
        const orig = btn.innerText;
        btn.innerText = "Validating...";

        for (let id of bms) {
            const val = document.getElementById(id).value.trim();
            if (val) {
                const check = await validateUrlInput(val, 'link');
                if (!check.valid) {
                    showError(id, check.msg);
                    hasError = true;
                }
            }
        }

        btn.innerText = orig;
        if (hasError) return;

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