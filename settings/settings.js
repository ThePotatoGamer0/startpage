const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const defaultProviderSelect = document.getElementById('defaultProviderSelect');
const searchSuggestionSelect = document.getElementById('searchSuggestionSelect');
const blurInput = document.getElementById('blurInput');
const logoUrlInput = document.getElementById('logoUrlInput');
const bookmarkGrid = document.getElementById('bookmarkGrid');

// Wallpaper Selectors
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

document.getElementById('addAliasBtn').addEventListener('click', () => {
    const kwInput = document.getElementById('newAliasKey');
    const urlInput = document.getElementById('newAliasUrl');
    const keyword = kwInput.value.trim().toLowerCase();
    const url = urlInput.value.trim();

    if (keyword && url) {
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
                <input type="text" class="bm-url-input" placeholder="URL" value="${savedUrl}">
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
    bgUrlInput.value = localStorage.getItem('sp_bg_url') || '';
    bgPollToggle.checked = localStorage.getItem('sp_bg_poll') === 'true';
    bgPollIntervalInput.value = localStorage.getItem('sp_bg_poll_interval') || '60';
    updateBgUiState();

    renderAliases();
    buildBookmarkCards();
}

saveSettingsBtn.addEventListener('click', () => {
    localStorage.setItem('sp_provider', defaultProviderSelect.value);
    localStorage.setItem('sp_search_suggestions', searchSuggestionSelect.value);
    localStorage.setItem('sp_blur', blurInput.value);
    localStorage.setItem('sp_logo', logoUrlInput.value);
    
    // Wallpaper Settings
    localStorage.setItem('sp_bg_url', bgUrlInput.value);
    localStorage.setItem('sp_bg_poll', bgPollToggle.checked);
    localStorage.setItem('sp_bg_poll_interval', bgPollIntervalInput.value);

    // Save Aliases
    localStorage.setItem('sp_aliases', JSON.stringify(searchAliases));

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

document.getElementById('applyIconBtn').addEventListener('click', () => {
    if (!currentEditingCard) return;
    const finalIconUrl = customIconInput.value.trim() !== '' ? customIconInput.value.trim() : currentlySelectedIconUrl;
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