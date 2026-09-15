// --- Inline SVG Component Icons (Sourced from Lucide) ---
const sysIcons = {
    cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>`,
    gpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="M2 17h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H2"/><path d="M2 21V3"/><path d="M7 17v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3"/><circle cx="16" cy="11" r="2"/><circle cx="8" cy="11" r="2"/></svg>`,
    ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="M12 12v-2"/><path d="M12 18v-2"/><path d="M16 12v-2"/><path d="M16 18v-2"/><path d="M2 11h1.5"/><path d="M20 18v-2"/><path d="M20.5 11H22"/><path d="M4 18v-2"/><path d="M8 12v-2"/><path d="M8 18v-2"/><rect x="2" y="6" width="20" height="10" rx="2"/></svg>`,
    disk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="M10 16h.01"/><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><path d="M21.946 12.013H2.054"/><path d="M6 16h.01"/></svg>`,
    netUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="m16 6-4-4-4 4"/><path d="M12 2v8"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/></svg>`,
    netDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sys-svg"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/></svg>`
};

function formatBytesToGB(bytes, base) {
    const divisor = base === '1000' ? 1000 : 1024;
    return (bytes / (divisor * divisor * divisor)).toFixed(1);
}

function shortenGpuName(name) {
    let cleanName = name.replace(/ADVANCED MICRO DEVICES, INC\./i, 'AMD').replace(/\[AMD\/ATI\]/i, '');
    cleanName = cleanName.replace(/NVIDIA/i, '').replace(/GeForce/i, '');
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    const upper = cleanName.toUpperCase();
    if ((upper.includes('RAPHAEL') || upper.includes('RADEON')) && !upper.startsWith('AMD')) cleanName = 'AMD ' + cleanName; 
    else if ((upper.includes('RTX') || upper.includes('GTX')) && !upper.startsWith('NVIDIA')) cleanName = 'NVIDIA ' + cleanName;
    return cleanName; 
}

function getProgressColor(pct) {
    if (pct <= 50) return `rgb(255, 255, 255)`; 
    if (pct <= 75) return `rgb(255, 255, ${Math.round(255 - ((pct - 50) / 25) * 255)})`; 
    if (pct <= 90) return `rgb(255, ${Math.round(255 - ((pct - 75) / 15) * 205)}, 50)`; 
    return `rgb(255, 50, 50)`; 
}

function buildStatBoxHtml(id, iconSvg, label, val1, val2, pct, isNet = false) {
    const color = isNet ? 'rgba(255,255,255,0.8)' : getProgressColor(pct);
    const displayPct = isNet ? 100 : Math.max(0, Math.min(100, pct));
    const isLong = label.length > 8; 
    const labelHtml = isLong ? `<div class="sys-label marquee"><span>${label}</span><span>${label}</span></div>` : `<div class="sys-label center-text"><span>${label}</span></div>`;
    const offset = 282.74 - (displayPct / 100) * 282.74;

    return `
        <div class="sys-box" id="${id}">
            <svg class="sys-ring-svg" viewBox="0 0 100 100"><circle class="sys-ring-bg" cx="50" cy="50" r="45"></circle><circle class="sys-ring-fill" cx="50" cy="50" r="45" style="stroke-dashoffset: ${offset}; stroke: ${color};"></circle></svg>
            <div class="sys-inner">
                <div class="sys-icon">${iconSvg}</div>
                <div class="sys-label-wrapper" title="${label}">${labelHtml}</div>
                <div class="sys-val" style="color: ${color}">${val1}</div>
                <div class="sys-subval" style="display: ${val2 ? 'block' : 'none'}">${val2 || ''}</div>
            </div>
            <div class="sys-line"><div class="sys-line-fill" style="width: ${displayPct}%; background-color: ${color};"></div></div>
        </div>
    `;
}

function updateStatBoxDom(id, val1, val2, pct, isNet = false) {
    const el = document.getElementById(id);
    if (!el) return;

    const color = isNet ? 'rgba(255,255,255,0.8)' : getProgressColor(pct);
    const displayPct = isNet ? 100 : Math.max(0, Math.min(100, pct));

    const val1El = el.querySelector('.sys-val');
    if (val1El.innerText !== val1) val1El.innerText = val1;
    val1El.style.color = color;

    const sub = el.querySelector('.sys-subval');
    if (val2) { if (sub.innerText !== val2) sub.innerText = val2; sub.style.display = 'block'; } else { sub.style.display = 'none'; }

    const ringFill = el.querySelector('.sys-ring-fill');
    if (ringFill) { ringFill.style.strokeDashoffset = 282.74 - (displayPct / 100) * 282.74; ringFill.style.stroke = color; }

    const line = el.querySelector('.sys-line-fill');
    if (line) { line.style.width = `${displayPct}%`; line.style.backgroundColor = color; }
}

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

function applyWidgetPosition(widgetId, posSetting, activeState, extraClasses = '') {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    if (posSetting === 'disabled' || !activeState) {
        if (!widget.classList.contains('hidden')) widget.classList.add('hidden'); return;
    }
    if (widget.classList.contains('hidden')) widget.classList.remove('hidden');

    const currentClasses = widget.className;
    let newClasses = currentClasses.replace(/\bpos-[a-z-]+\b/g, '').trim();
    if (extraClasses) { newClasses = newClasses.replace(/\bstyle-[a-z-]+\b/g, '').trim(); newClasses = `${newClasses} ${extraClasses}`; }

    const drawerLeft = document.getElementById('drawerLeft');
    const drawerRight = document.getElementById('drawerRight');
    const body = document.body; let targetParent = body;

    if (posSetting === 'drawer-left') targetParent = drawerLeft;
    else if (posSetting === 'drawer-right') targetParent = drawerRight;
    else {
        if (posSetting === 'center' && widgetId === 'mediaPlayer') targetParent = document.querySelector('.content');
        else newClasses += ` pos-${posSetting}`;
    }

    if (widget.className !== newClasses) widget.className = newClasses;
    if (widget.parentNode !== targetParent) targetParent.appendChild(widget);
}

function updateDrawerVisibility() {
    const drawerLeft = document.getElementById('drawerLeft'); const triggerLeft = document.querySelector('.trigger-left');
    const drawerRight = document.getElementById('drawerRight'); const triggerRight = document.querySelector('.trigger-right');
    const leftActive = Array.from(drawerLeft.children).some(c => !c.classList.contains('hidden'));
    const rightActive = Array.from(drawerRight.children).some(c => !c.classList.contains('hidden'));

    if (triggerLeft) { triggerLeft.style.display = leftActive ? 'block' : 'none'; if (!leftActive) drawerLeft.classList.remove('open'); }
    if (triggerRight) { triggerRight.style.display = rightActive ? 'block' : 'none'; if (!rightActive) drawerRight.classList.remove('open'); }
}

const mediaArt = document.getElementById('mediaArt');
const mediaTitle = document.getElementById('mediaTitle');
const mediaArtist = document.getElementById('mediaArtist');
const mediaPlayPause = document.getElementById('mediaPlayPause');

document.getElementById('mediaPrev').addEventListener('click', () => fetch('/api/media/prev', { method: 'POST' }));
document.getElementById('mediaNext').addEventListener('click', () => fetch('/api/media/next', { method: 'POST' }));
mediaPlayPause.addEventListener('click', () => {
    fetch('/api/media/playpause', { method: 'POST' });
    if (mediaPlayPause.innerHTML.includes('M8 5v14l11-7z')) mediaPlayPause.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    else mediaPlayPause.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
});

let lastArtUrl = '';
const bg1 = document.getElementById('bg1'); const bg2 = document.getElementById('bg2');
let activeBg = 1;

// --- CUSTOM WALLPAPER SYNC LOGIC ---
let customBgPollTimer = null;

function updateBackground(url) {
    if (!url) return;
    if (activeBg === 1) {
        bg2.style.backgroundImage = `url('${url}')`; bg2.classList.add('active'); bg1.classList.remove('active'); activeBg = 2;
    } else {
        bg1.style.backgroundImage = `url('${url}')`; bg1.classList.add('active'); bg2.classList.remove('active'); activeBg = 1;
    }
}

// --- Smart JSON Fetcher ---
async function pollAndApplyCustomWallpaper(url, isPolled) {
    const timeParam = isPolled ? (url.includes('?') ? '&' : '?') + `t=${new Date().getTime()}` : '';
    const fetchUrl = url + timeParam;
    let finalImageUrl = fetchUrl;

    try {
        // Route through our Python proxy to bypass CORS
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(fetchUrl)}`;
        const res = await fetch(proxyUrl, { headers: { 'Accept': 'application/json, image/*, */*' } });
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            
            // Smart JSON crawler to find the image link
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

let currentBgTimestamp = 0;
let heartbeatTimer = null;
let precisionStrikeTimer = null;

const clientId = Math.random().toString(36).substring(2, 15);

async function startHeartbeat() {
    clearTimeout(heartbeatTimer);

    try {
        const response = await fetch(`/api/heartbeat?client=${clientId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const mediaPos = localStorage.getItem('sp_media_pos') || 'disabled';
        applyWidgetPosition('mediaPlayer', mediaPos, data.media && data.media.active);

        if (mediaPos !== 'disabled' && data.media && data.media.active) {
            mediaTitle.innerText = data.media.title; mediaArtist.innerText = data.media.artist || 'Unknown Artist';
            if (data.media.status === 'Playing') mediaPlayPause.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            else mediaPlayPause.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            if (data.media.artUrl && data.media.artUrl !== lastArtUrl) { mediaArt.style.backgroundImage = `url('${data.media.artUrl}')`; lastArtUrl = data.media.artUrl; } 
            else if (!data.media.artUrl && lastArtUrl !== 'fallback') { mediaArt.style.backgroundImage = `url('chrome://branding/content/about-logo.png')`; lastArtUrl = 'fallback'; }
        }

        const sysPos = localStorage.getItem('sp_sys_pos') || 'disabled';
        const sysStyle = localStorage.getItem('sp_sys_style') || 'style-circular';
        applyWidgetPosition('systemMonitor', sysPos, !!data.system, sysStyle);

        if (sysPos !== 'disabled' && data.system) {
            const tempUnit = localStorage.getItem('sp_sys_temp') || 'C';
            const storageBase = localStorage.getItem('sp_sys_storage') || '1024';
            const netUnit = localStorage.getItem('sp_sys_net') || 'MBps';
            const showCpu = localStorage.getItem('sp_sys_show_cpu') !== 'false';
            const showRam = localStorage.getItem('sp_sys_show_ram') !== 'false';
            const showDisk = localStorage.getItem('sp_sys_show_disk') !== 'false';
            const showNetDown = localStorage.getItem('sp_sys_show_net_down') !== 'false';
            const showNetUp = localStorage.getItem('sp_sys_show_net_up') !== 'false';

            const sysGrid = document.getElementById('sysGrid');
            const currentIds = Array.from(sysGrid.children).map(c => c.id);
            const expectedIds = []; const activeStats = [];

            if (showCpu) {
                let temp = data.system.cpu.temp; if (tempUnit === 'F') temp = (temp * 9/5) + 32;
                expectedIds.push('sys-box-cpu'); activeStats.push({ id: 'sys-box-cpu', icon: sysIcons.cpu, label: 'CPU', val1: `${data.system.cpu.load.toFixed(1)}%`, val2: `${temp.toFixed(1)}°${tempUnit}`, pct: data.system.cpu.load, isNet: false });
            }

            if (data.system.gpu) {
                data.system.gpu.forEach((gpu, idx) => {
                    if (localStorage.getItem(`sp_sys_show_gpu_${idx}`) !== 'false') {
                        const safeName = gpu.name.replace(/[^a-zA-Z0-9]/g, ''); const gId = `sys-box-gpu-${safeName}`;
                        expectedIds.push(gId); activeStats.push({ id: gId, icon: sysIcons.gpu, label: shortenGpuName(gpu.name).toUpperCase(), val1: `${gpu.load}%`, val2: '', pct: gpu.load, isNet: false });
                    }
                });
            }

            const storageLabel = storageBase === '1000' ? 'GB' : 'GiB';
            if (showRam) {
                const ramUsed = formatBytesToGB(data.system.ram.used, storageBase); const ramTotal = formatBytesToGB(data.system.ram.total, storageBase); const ramPercent = (data.system.ram.used / data.system.ram.total) * 100;
                expectedIds.push('sys-box-ram'); activeStats.push({ id: 'sys-box-ram', icon: sysIcons.ram, label: 'RAM', val1: `${ramUsed}${storageLabel}`, val2: `${ramTotal}${storageLabel}`, pct: ramPercent, isNet: false });
            }

            if (showDisk) {
                const diskUsed = formatBytesToGB(data.system.disk.used, storageBase); const diskTotal = formatBytesToGB(data.system.disk.total, storageBase); const diskPercent = (data.system.disk.used / data.system.disk.total) * 100;
                expectedIds.push('sys-box-disk'); activeStats.push({ id: 'sys-box-disk', icon: sysIcons.disk, label: 'DISK', val1: `${diskUsed}${storageLabel}`, val2: `${diskTotal}${storageLabel}`, pct: diskPercent, isNet: false });
            }

            let downSpeed = data.system.network.down; let upSpeed = data.system.network.up; let netLabel = 'MB/s';
            if (netUnit === 'Mbps') { downSpeed *= 8; upSpeed *= 8; netLabel = 'Mbps'; }
            
            if (showNetDown) { expectedIds.push('sys-box-net-down'); activeStats.push({ id: 'sys-box-net-down', icon: sysIcons.netDown, label: 'DOWNLOAD', val1: `${downSpeed.toFixed(1)}`, val2: netLabel, pct: 100, isNet: true }); }
            if (showNetUp) { expectedIds.push('sys-box-net-up'); activeStats.push({ id: 'sys-box-net-up', icon: sysIcons.netUp, label: 'UPLOAD', val1: `${upSpeed.toFixed(1)}`, val2: netLabel, pct: 100, isNet: true }); }

            if (JSON.stringify(currentIds) !== JSON.stringify(expectedIds)) {
                let gridHtml = ''; activeStats.forEach(stat => gridHtml += buildStatBoxHtml(stat.id, stat.icon, stat.label, stat.val1, stat.val2, stat.pct, stat.isNet)); sysGrid.innerHTML = gridHtml;
            } else { activeStats.forEach(stat => updateStatBoxDom(stat.id, stat.val1, stat.val2, stat.pct, stat.isNet)); }
        }

        // 3. Process Backend Sync Wallpaper (ONLY if enabled)
        const syncBg = localStorage.getItem('sp_bg_sync') !== 'false';
        if (syncBg && data.wallpaperTimestamp) {
            if (currentBgTimestamp === 0) currentBgTimestamp = data.wallpaperTimestamp;
            else if (data.wallpaperTimestamp !== currentBgTimestamp) {
                currentBgTimestamp = data.wallpaperTimestamp; 
                updateBackground(`firefox_bg.jpg?t=${new Date().getTime()}`);
            }

            if (data.nextWallpaperUpdate) {
                const nowInSeconds = Date.now() / 1000;
                const msUntilNextUpdate = Math.max((data.nextWallpaperUpdate - nowInSeconds) * 1000, 0);
                if (msUntilNextUpdate > 0 && msUntilNextUpdate <= 125000) {
                    clearTimeout(precisionStrikeTimer);
                    precisionStrikeTimer = setTimeout(() => { startHeartbeat(); }, msUntilNextUpdate);
                }
            }
        }

        const clipPos = localStorage.getItem('sp_clip_pos') || 'disabled'; 
        const hasClipData = data.clipboard && data.clipboard.length > 0;
        applyWidgetPosition('clipboardWidget', clipPos, hasClipData);

        if (typeof window.lastClipboardData === 'undefined') window.lastClipboardData = [];

        if (clipPos !== 'disabled' && hasClipData) {
            const clipContainer = document.getElementById('clipContainer');
            if (JSON.stringify(data.clipboard) !== JSON.stringify(window.lastClipboardData)) {
                window.lastClipboardData = data.clipboard; clipContainer.innerHTML = '';
                data.clipboard.forEach(text => {
                    const div = document.createElement('div'); div.className = 'clip-item'; div.textContent = text.length > 30 ? text.substring(0, 30) + '...' : text;
                    const badge = document.createElement('span'); badge.className = 'copy-badge'; badge.textContent = '✓'; div.appendChild(badge);
                    div.onclick = () => { navigator.clipboard.writeText(text); div.classList.add('copied'); setTimeout(() => div.classList.remove('copied'), 1500); };
                    clipContainer.appendChild(div);
                });
            }
        }
        
        updateDrawerVisibility();

        const nextPollSpeed = data.suggestedInterval || 500;
        heartbeatTimer = setTimeout(startHeartbeat, nextPollSpeed);

    } catch (e) {
        console.error("Heartbeat failed", e);
        applyWidgetPosition('mediaPlayer', 'disabled', false); 
        applyWidgetPosition('systemMonitor', 'disabled', false);
        applyWidgetPosition('clipboardWidget', 'disabled', false);
        updateDrawerVisibility();
        heartbeatTimer = setTimeout(startHeartbeat, 3000);
    }
}

const mainLogo = document.getElementById('mainLogo');

function loadSettings() {
    const savedProvider = localStorage.getItem('sp_provider') || 'startpage';
    const savedBlur = localStorage.getItem('sp_blur') || '0';
    const savedLogo = localStorage.getItem('sp_logo') || 'chrome://branding/content/about-logo.png';
    const savedMediaPos = localStorage.getItem('sp_media_pos') || 'disabled';
    const savedSysPos = localStorage.getItem('sp_sys_pos') || 'disabled';
    const savedClipPos = localStorage.getItem('sp_clip_pos') || 'disabled';

    setActiveProvider(savedProvider);
    bg1.style.filter = `blur(${savedBlur}px)`; bg2.style.filter = `blur(${savedBlur}px)`;
    mainLogo.src = savedLogo;

    renderBookmarks();

    applyWidgetPosition('mediaPlayer', savedMediaPos, true);
    applyWidgetPosition('systemMonitor', savedSysPos, true);
    applyWidgetPosition('clipboardWidget', savedClipPos, true);
    
    updateDrawerVisibility();

    // --- Boot Custom Wallpaper ---
    const syncBg = localStorage.getItem('sp_bg_sync') !== 'false';
    const customUrl = localStorage.getItem('sp_bg_url') || '';
    const pollBg = localStorage.getItem('sp_bg_poll') === 'true';
    const pollInterval = parseInt(localStorage.getItem('sp_bg_poll_interval')) || 60;

    if (!syncBg && customUrl) {
        pollAndApplyCustomWallpaper(customUrl, pollBg);

        if (pollBg && pollInterval > 0) {
            clearInterval(customBgPollTimer);
            customBgPollTimer = setInterval(() => {
                pollAndApplyCustomWallpaper(customUrl, true);
            }, pollInterval * 1000);
        }
    } else if (syncBg) {
        updateBackground(`firefox_bg.jpg?t=${new Date().getTime()}`);
    }
}

function forceFocus() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.classList.remove('loading'); searchInput.focus(); setTimeout(() => searchInput.focus(), 50); }
}

document.querySelectorAll('.drawer-trigger').forEach(trigger => {
    trigger.addEventListener('mouseenter', (e) => {
        if (e.target.style.display === 'none') return;
        if (e.target.classList.contains('trigger-left')) document.getElementById('drawerLeft').classList.add('open');
        if (e.target.classList.contains('trigger-right')) document.getElementById('drawerRight').classList.add('open');
    });
});

document.querySelectorAll('.drawer').forEach(drawer => {
    drawer.addEventListener('mouseleave', () => {
        drawer.classList.remove('open');
    });
});

window.addEventListener('load', forceFocus);
window.addEventListener('focus', forceFocus);

loadSettings();
startHeartbeat();