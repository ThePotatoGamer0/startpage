const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const defaultProviderSelect = document.getElementById('defaultProviderSelect');
const searchSuggestionSelect = document.getElementById('searchSuggestionSelect');
const blurInput = document.getElementById('blurInput');
const logoUrlInput = document.getElementById('logoUrlInput');
const bookmarkGrid = document.getElementById('bookmarkGrid');

// Wallpaper Selectors
const bgWarpToggle = document.getElementById('bgWarpToggle');
const bgUrlInput = document.getElementById('bgUrlInput');
const bgPollToggle = document.getElementById('bgPollToggle');
const bgPollIntervalGroup = document.getElementById('bgPollIntervalGroup');
const bgPollIntervalInput = document.getElementById('bgPollIntervalInput');

// Alias Manager Data
let searchAliases = [];
let allIcons = [];

if (!localStorage.getItem('sp_aliases')) {
    searchAliases = [
        { keyword: '!yt', url: 'https://youtube.com/results?search_query=%s' },
        { keyword: '!r', url: 'https://reddit.com/search?q=%s' },
        { keyword: '!g', url: 'https://github.com/search?q=%s' },
        { keyword: '!tw', url: 'https://twitch.tv/search?term=%s' }
    ];
} else {
    searchAliases = JSON.parse(localStorage.getItem('sp_aliases'));
}

// --- Dynamic Widget Settings Engine ---
const widgetsEnableToggle = document.getElementById('widgetsEnableToggle');
const widgetSelect = document.getElementById('widgetSelect');
const dynamicWidgetSettings = document.getElementById('dynamicWidgetSettings');
const widgetPreviewContainer = document.getElementById('widgetPreviewContainer');

// Register all your content widgets here (excluding widget-window shell)
const activeWidgetTags = ['widget-clock', 'widget-greeting']; 
let widgetConfigState = {}; 

async function initWidgetsTab() {
    widgetsEnableToggle.checked = localStorage.getItem('sp_widgets_enabled') !== 'false';
    
    // Wait for all active components to be defined
    await Promise.all(activeWidgetTags.map(tag => customElements.whenDefined(tag)));

    widgetSelect.innerHTML = '';
    
    activeWidgetTags.forEach(tag => {
        const componentClass = customElements.get(tag);
        if (componentClass && componentClass.widgetConfig) {
            const schema = componentClass.widgetConfig;
            
            const opt = document.createElement('option');
            opt.value = schema.id;
            opt.innerText = schema.name;
            opt.dataset.tag = tag;
            widgetSelect.appendChild(opt);

            const saved = JSON.parse(localStorage.getItem(`sp_widget_${schema.id}_config`) || '{}');
            if (saved.xRatio === undefined) saved.xRatio = 0.5;
            if (saved.yRatio === undefined) saved.yRatio = 0.2;
            
            schema.fields.forEach(f => {
                if (saved[f.id] === undefined) saved[f.id] = f.default;
            });
            
            widgetConfigState[schema.id] = saved;
        }
    });

    widgetSelect.addEventListener('change', renderWidgetSettingsForm);
    if (widgetSelect.options.length > 0) renderWidgetSettingsForm();
}

function renderWidgetSettingsForm() {
    dynamicWidgetSettings.innerHTML = '';
    widgetPreviewContainer.innerHTML = '';

    const selectedOption = widgetSelect.options[widgetSelect.selectedIndex];
    if (!selectedOption) return;

    const widgetId = selectedOption.value;
    const widgetTag = selectedOption.dataset.tag;
    const schema = customElements.get(widgetTag).widgetConfig;
    const currentState = widgetConfigState[widgetId];

    // Build Preview
    const windowShell = document.createElement('widget-window');
    windowShell.style.position = 'relative'; 
    windowShell.style.left = 'auto';
    windowShell.style.top = 'auto';
    windowShell.style.setProperty('--widget-edit-opacity', '1');
    windowShell.style.setProperty('--widget-edit-events', 'auto');
    
    const liveWidgetContent = document.createElement(widgetTag);
    
    const updatePreviewAttribute = (id, val) => {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        liveWidgetContent.setAttribute(id, strVal);
    };

    schema.fields.forEach(f => updatePreviewAttribute(f.id, currentState[f.id]));

    windowShell.appendChild(liveWidgetContent);
    widgetPreviewContainer.appendChild(windowShell);

    // Build Form Fields
    schema.fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.style.marginBottom = '24px';
        
        const label = document.createElement('label');
        label.innerText = field.label;
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.style.color = 'rgba(255,255,255,0.9)';
        if (field.type !== 'checkbox') group.appendChild(label);

        let updateState = (val) => {
            currentState[field.id] = val;
            updatePreviewAttribute(field.id, val);
        };

        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
            case 'color': {
                const input = document.createElement('input');
                input.type = field.type;
                input.className = 'form-input';
                if (field.min !== undefined) input.min = field.min;
                if (field.max !== undefined) input.max = field.max;
                if (field.step !== undefined) input.step = field.step;
                if (field.placeholder) input.placeholder = field.placeholder;
                input.value = currentState[field.id];
                
                if (field.type === 'color') {
                    input.style.padding = '0';
                    input.style.height = '40px';
                    input.style.cursor = 'pointer';
                }
                
                input.addEventListener('input', e => updateState(e.target.value));
                group.appendChild(input);
                break;
            }

            case 'textarea': {
                const textarea = document.createElement('textarea');
                textarea.className = 'form-input';
                textarea.style.minHeight = '100px';
                textarea.style.resize = 'vertical';
                if (field.placeholder) textarea.placeholder = field.placeholder;
                textarea.value = currentState[field.id];
                textarea.addEventListener('input', e => updateState(e.target.value));
                group.appendChild(textarea);
                break;
            }

            case 'checkbox': {
                const cbGroup = document.createElement('div');
                cbGroup.className = 'checkbox-group';
                const cbLabel = document.createElement('label');
                cbLabel.className = 'checkbox-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = currentState[field.id] === true || currentState[field.id] === 'true';
                
                cb.addEventListener('change', e => updateState(e.target.checked));
                cbLabel.appendChild(cb);
                cbLabel.appendChild(document.createTextNode(' ' + field.label));
                cbGroup.appendChild(cbLabel);
                group.appendChild(cbGroup);
                break;
            }

            case 'range': {
                const rangeContainer = document.createElement('div');
                rangeContainer.style.display = 'flex';
                rangeContainer.style.alignItems = 'center';
                rangeContainer.style.gap = '16px';
                
                const range = document.createElement('input');
                range.type = 'range';
                range.style.flex = '1';
                range.min = field.min || 0;
                range.max = field.max || 100;
                range.step = field.step || 1;
                range.value = currentState[field.id];
                
                const readout = document.createElement('span');
                readout.style.fontFamily = 'monospace';
                readout.style.color = '#4ade80';
                readout.style.width = '40px';
                readout.innerText = range.value;

                range.addEventListener('input', e => {
                    readout.innerText = e.target.value;
                    updateState(e.target.value);
                });
                
                rangeContainer.appendChild(range);
                rangeContainer.appendChild(readout);
                group.appendChild(rangeContainer);
                break;
            }

            case 'select':
            case 'font': {
                const select = document.createElement('select');
                select.className = 'form-select';
                field.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.innerText = opt.label;
                    if (field.type === 'font') o.style.fontFamily = opt.value;
                    select.appendChild(o);
                });
                select.value = currentState[field.id];
                if (field.type === 'font') select.style.fontFamily = select.value;

                select.addEventListener('change', e => {
                    if (field.type === 'font') select.style.fontFamily = e.target.value;
                    updateState(e.target.value);
                });
                group.appendChild(select);
                break;
            }

            case 'segmented': {
                const segContainer = document.createElement('div');
                segContainer.style.display = 'flex';
                segContainer.style.background = 'rgba(0,0,0,0.4)';
                segContainer.style.padding = '4px';
                segContainer.style.borderRadius = '12px';
                segContainer.style.gap = '4px';

                field.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.innerText = opt.label;
                    btn.style.flex = '1';
                    btn.style.padding = '10px';
                    btn.style.border = 'none';
                    btn.style.borderRadius = '8px';
                    btn.style.cursor = 'pointer';
                    btn.style.fontFamily = 'inherit';
                    btn.style.fontWeight = 'bold';
                    btn.style.transition = 'all 0.2s';
                    
                    const isActive = currentState[field.id] === opt.value;
                    btn.style.background = isActive ? 'rgba(255,255,255,0.2)' : 'transparent';
                    btn.style.color = isActive ? '#fff' : 'rgba(255,255,255,0.6)';

                    btn.addEventListener('click', () => {
                        Array.from(segContainer.children).forEach(c => {
                            c.style.background = 'transparent';
                            c.style.color = 'rgba(255,255,255,0.6)';
                        });
                        btn.style.background = 'rgba(255,255,255,0.2)';
                        btn.style.color = '#fff';
                        updateState(opt.value);
                    });
                    segContainer.appendChild(btn);
                });
                group.appendChild(segContainer);
                break;
            }
        }
        
        dynamicWidgetSettings.appendChild(group);
    });
}


// --- Validation Helpers ---
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

// --- Utility: Debounce ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout); timeout = setTimeout(later, wait);
    };
}

// --- Tab Switching Logic ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    });
});

// --- Wallpaper UI Logic ---
function updateBgUiState() {
    if (bgPollToggle.checked) {
        bgPollIntervalGroup.style.opacity = '1';
        bgPollIntervalGroup.style.pointerEvents = 'auto';
    } else {
        bgPollIntervalGroup.style.opacity = '0.5';
        bgPollIntervalGroup.style.pointerEvents = 'none';
    }
}
bgPollToggle.addEventListener('change', updateBgUiState);

// --- Alias Manager Logic ---
function renderAliases() {
    const grid = document.getElementById('aliasGrid');
    grid.innerHTML = '';
    searchAliases.forEach((alias, idx) => {
        grid.innerHTML += `
            <div class="alias-row">
                <span class="alias-kw">${alias.keyword}</span>
                <span class="alias-url" title="${alias.url}">${alias.url}</span>
                <button class="alias-del" data-idx="${idx}" title="Remove Alias">&times;</button>
            </div>
        `;
    });

    document.querySelectorAll('.alias-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-idx');
            searchAliases.splice(idx, 1);
            renderAliases();
        });
    });
}

document.getElementById('addAliasBtn').addEventListener('click', async () => {
    const kwInput = document.getElementById('newAliasKey');
    const urlInput = document.getElementById('newAliasUrl');
    const keyword = kwInput.value.trim().toLowerCase();
    const url = urlInput.value.trim();

    if (keyword && url) {
        const btn = document.getElementById('addAliasBtn');
        const orig = btn.innerText;
        btn.innerText = "...";
        
        const check = await validateUrlInput(url, 'link');
        btn.innerText = orig;
        
        if (!check.valid) {
            showError('newAliasUrl', check.msg);
            return;
        }

        searchAliases.push({ keyword, url });
        kwInput.value = '';
        urlInput.value = '';
        renderAliases();
    }
});

// --- Right Click Clear Logic ---
window.clearIconRightClick = function(event, card) {
    event.preventDefault();
    const urlValue = card.querySelector('.bm-url-input').value.trim();
    const iconHiddenInput = card.querySelector('.bm-icon-input');
    const mainImg = card.querySelector('.bm-main-img');
    const refImg = card.querySelector('.bm-favicon-reference');

    iconHiddenInput.value = '';
    let domain = 'example.com';
    try { if(urlValue) domain = new URL(urlValue.startsWith('http') ? urlValue : 'https://' + urlValue).hostname; } catch(e) {}
    const fetchedFavicon = urlValue ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : 'chrome://branding/content/about-logo.png';
    mainImg.src = fetchedFavicon; refImg.style.display = 'none';
};

// --- URL Input Handler (Debounced) ---
function handleUrlChange(card, value) {
    let domain = 'example.com';
    try { if (value.trim()) domain = new URL(value.startsWith('http') ? value : 'https://' + value).hostname; } catch(e) {}
    const faviconUrl = value.trim() ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : 'chrome://branding/content/about-logo.png';
    const customIcon = card.querySelector('.bm-icon-input').value.trim();
    const mainImg = card.querySelector('.bm-main-img');
    const refImg = card.querySelector('.bm-favicon-reference');

    if (customIcon) {
        if (value.trim()) { refImg.src = faviconUrl; refImg.style.display = 'block'; } 
        else { refImg.style.display = 'none'; }
    } else {
        mainImg.src = faviconUrl; refImg.style.display = 'none';
    }
}

// --- Build Bookmark Cards & Initialize SortableJS ---
function buildBookmarkCards() {
    bookmarkGrid.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
        const savedUrl = localStorage.getItem(`sp_bm${i}_url`) || '';
        const savedIcon = localStorage.getItem(`sp_bm${i}_icon`) || '';
        
        let domain = 'example.com';
        try { if(savedUrl) domain = new URL(savedUrl.startsWith('http') ? savedUrl : 'https://' + savedUrl).hostname; } catch(e) {}
        
        const generatedFavicon = savedUrl ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : 'chrome://branding/content/about-logo.png';
        const displayIcon = savedIcon || generatedFavicon;
        const showRefIcon = (savedIcon && savedUrl) ? 'block' : 'none';

        const card = document.createElement('div');
        card.className = 'bm-card';
        card.innerHTML = `
            <div class="bm-logo-container" title="Left-click to edit, Right-click to clear" onclick="openIconModal(this.closest('.bm-card'))" oncontextmenu="clearIconRightClick(event, this.closest('.bm-card'))">
                <img class="bm-main-img" src="${displayIcon}" onerror="this.src='chrome://branding/content/about-logo.png'">
                <img class="bm-favicon-reference" src="${generatedFavicon}" style="display: ${showRefIcon};" onerror="this.style.display='none'">
                <div class="bm-logo-overlay">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </div>
            </div>
            <div class="bm-inputs">
                <label class="bm-slot-label">Slot ${i}</label>
                <input type="text" class="bm-url-input" id="bm-url-${i}" placeholder="URL" value="${savedUrl}">
                <input type="hidden" class="bm-icon-input" value="${savedIcon}">
            </div>
        `;
        bookmarkGrid.appendChild(card);

        const urlInput = card.querySelector('.bm-url-input');
        const debouncedHandler = debounce((val) => handleUrlChange(card, val), 1000);
        urlInput.addEventListener('input', (e) => debouncedHandler(e.target.value));
    }

    new Sortable(bookmarkGrid, {
        animation: 350, 
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", 
        filter: '.bm-logo-container, input', 
        preventOnFilter: false,
        onEnd: function () {
            document.querySelectorAll('.bm-card').forEach((card, index) => {
                const label = card.querySelector('.bm-slot-label');
                if (label) label.innerText = `Slot ${index + 1}`;
            });
        }
    });
}

// --- Load/Save Settings ---
async function loadFormValues() {
    try {
        const response = await fetch('/settings/icons.json');
        if (response.ok) allIcons = await response.json();
    } catch (e) { console.warn("Could not load icons.json."); }

    if (defaultProviderSelect) defaultProviderSelect.value = localStorage.getItem('sp_provider') || 'startpage';
    if (searchSuggestionSelect) searchSuggestionSelect.value = localStorage.getItem('sp_search_suggestions') || 'match';
    
    if (blurInput) blurInput.value = localStorage.getItem('sp_blur') || '0';
    if (logoUrlInput) logoUrlInput.value = localStorage.getItem('sp_logo') || 'chrome://branding/content/about-logo.png';

    // Wallpaper
    bgWarpToggle.checked = localStorage.getItem('sp_bg_warp') === 'true';
    bgUrlInput.value = localStorage.getItem('sp_bg_url') || '';
    bgPollToggle.checked = localStorage.getItem('sp_bg_poll') === 'true';
    bgPollIntervalInput.value = localStorage.getItem('sp_bg_poll_interval') || '60';
    updateBgUiState();

    renderAliases();
    buildBookmarkCards();
    initWidgetsTab(); // <-- Boot the new widget settings engine
}

saveSettingsBtn.addEventListener('click', async () => {
    saveSettingsBtn.innerText = "Validating...";
    let hasError = false;
    let firstErrorTab = null;

    // Validate Logo
    const logoUrl = logoUrlInput.value.trim();
    if (logoUrl && !logoUrl.startsWith('chrome://') && !logoUrl.startsWith('browserlogos/')) {
        const check = await validateUrlInput(logoUrl, 'logo');
        if (!check.valid) { 
            showError('logoUrlInput', check.msg); 
            hasError = true; 
            if (!firstErrorTab) firstErrorTab = 'general';
        }
    }

    // Validate Wallpaper
    const bgUrl = bgUrlInput.value.trim();
    if (bgUrl) {
        const check = await validateUrlInput(bgUrl, 'wallpaper');
        if (!check.valid) { 
            showError('bgUrlInput', check.msg); 
            hasError = true; 
            if (!firstErrorTab) firstErrorTab = 'wallpaper';
        }
    }

    // Validate Bookmarks
    for (let i = 1; i <= 8; i++) {
        const el = document.getElementById(`bm-url-${i}`);
        if (el && el.value.trim()) {
            const check = await validateUrlInput(el.value.trim(), 'link');
            if (!check.valid) { 
                showError(`bm-url-${i}`, check.msg); 
                hasError = true; 
                if (!firstErrorTab) firstErrorTab = 'bookmarks';
            }
        }
    }

    if (hasError) {
        if (firstErrorTab) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelector(`.tab-btn[data-tab="${firstErrorTab}"]`).classList.add('active');
            document.getElementById(firstErrorTab).classList.add('active');
        }
        saveSettingsBtn.innerText = "Save & Apply";
        return;
    }

    localStorage.setItem('sp_provider', defaultProviderSelect.value);
    localStorage.setItem('sp_search_suggestions', searchSuggestionSelect.value);
    localStorage.setItem('sp_blur', blurInput.value);
    localStorage.setItem('sp_logo', logoUrl);
    
    localStorage.setItem('sp_bg_warp', bgWarpToggle.checked);
    localStorage.setItem('sp_bg_url', bgUrl);
    localStorage.setItem('sp_bg_poll', bgPollToggle.checked);
    localStorage.setItem('sp_bg_poll_interval', bgPollIntervalInput.value);

    localStorage.setItem('sp_aliases', JSON.stringify(searchAliases));
    
    // Save Widgets configurations directly from our dynamically built state object
    localStorage.setItem('sp_widgets_enabled', widgetsEnableToggle.checked);
    Object.keys(widgetConfigState).forEach(widgetId => {
        localStorage.setItem(`sp_widget_${widgetId}_config`, JSON.stringify(widgetConfigState[widgetId]));
    });

    const cards = document.querySelectorAll('.bm-card');
    cards.forEach((card, index) => {
        const slotNum = index + 1;
        const url = card.querySelector('.bm-url-input').value;
        const icon = card.querySelector('.bm-icon-input').value;
        localStorage.setItem(`sp_bm${slotNum}_url`, url);
        localStorage.setItem(`sp_bm${slotNum}_icon`, icon);
    });

    window.location.href = '/';
});

// --- Icon Modal Logic ---
let currentlySelectedIconUrl = null;
let currentEditingCard = null;
const iconModal = document.getElementById('iconModal');
const iconGridResults = document.getElementById('iconGridResults');
const iconSearchInput = document.getElementById('iconSearchInput');
const customIconInput = document.getElementById('customIconInput');
const clearIconBtn = document.getElementById('clearIconBtn');

function renderIconGrid(filterQuery = "") {
    iconGridResults.innerHTML = '';
    const query = filterQuery.toLowerCase().trim();
    let displayIcons = [];

    if (query === "") {
        const defaults = ['youtube', 'github', 'netflix', 'discord', 'spotify', 'docker', 'reddit', 'archlinux'];
        displayIcons = allIcons.filter(icon => defaults.includes(icon.slug));
    } else {
        displayIcons = allIcons.filter(icon => icon.name.toLowerCase().includes(query) || icon.slug.toLowerCase().includes(query));
    }

    const limitedIcons = displayIcons.slice(0, 50);
    if (query !== "" && !limitedIcons.some(icon => icon.slug === query)) limitedIcons.unshift({ name: `Custom Slug: ${query}`, slug: query });

    limitedIcons.forEach(iconData => {
        const url = `https://cdn.simpleicons.org/${iconData.slug}/white`;
        const div = document.createElement('div'); div.className = 'icon-item'; div.title = iconData.name; div.onclick = () => selectIcon(div, url);
        const img = document.createElement('img'); img.src = url; img.loading = "lazy"; img.onerror = () => div.remove();
        div.appendChild(img); iconGridResults.appendChild(div);
    });
}

function selectIcon(element, url) {
    document.querySelectorAll('.icon-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected'); currentlySelectedIconUrl = url; customIconInput.value = ''; 
}

function openIconModal(card) {
    currentEditingCard = card; iconModal.classList.add('show'); iconSearchInput.value = '';
    customIconInput.value = card.querySelector('.bm-icon-input').value; currentlySelectedIconUrl = null; renderIconGrid();
}

function closeIconModal() { iconModal.classList.remove('show'); currentEditingCard = null; }

clearIconBtn.addEventListener('click', () => { customIconInput.value = ''; currentlySelectedIconUrl = null; document.getElementById('applyIconBtn').click(); });

document.getElementById('applyIconBtn').addEventListener('click', async () => {
    if (!currentEditingCard) return;
    
    let finalIconUrl = currentlySelectedIconUrl;
    const customUrl = customIconInput.value.trim();
    
    if (customUrl) {
        const btn = document.getElementById('applyIconBtn');
        const orig = btn.innerText;
        btn.innerText = "Checking...";
        const check = await validateUrlInput(customUrl, 'icon');
        btn.innerText = orig;
        if (!check.valid) {
            showError('customIconInput', check.msg);
            return;
        }
        finalIconUrl = customUrl;
    }

    const urlValue = currentEditingCard.querySelector('.bm-url-input').value.trim();
    let domain = 'example.com';
    try { if(urlValue) domain = new URL(urlValue.startsWith('http') ? urlValue : 'https://' + urlValue).hostname; } catch(e) {}
    const fetchedFavicon = urlValue ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : 'chrome://branding/content/about-logo.png';
    
    const mainImg = currentEditingCard.querySelector('.bm-main-img');
    const refImg = currentEditingCard.querySelector('.bm-favicon-reference');
    const iconHiddenInput = currentEditingCard.querySelector('.bm-icon-input');

    if (finalIconUrl) {
        iconHiddenInput.value = finalIconUrl; mainImg.src = finalIconUrl;
        if (urlValue) { refImg.src = fetchedFavicon; refImg.style.display = 'block'; }
    } else if (customIconInput.value.trim() === '') {
        iconHiddenInput.value = ''; mainImg.src = fetchedFavicon; refImg.style.display = 'none';
    }
    closeIconModal();
});

iconSearchInput.addEventListener('input', (e) => renderIconGrid(e.target.value));
document.getElementById('closeIconModal').addEventListener('click', closeIconModal);
document.getElementById('cancelIconBtn').addEventListener('click', closeIconModal);
iconModal.addEventListener('click', (e) => { if (e.target === iconModal) closeIconModal(); });

document.addEventListener('DOMContentLoaded', loadFormValues);