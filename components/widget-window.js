const windowTemplate = document.createElement('template');
windowTemplate.innerHTML = `
    <style>
        :host {
            position: absolute;
            display: block;
            left: var(--widget-x, 50px);
            top: var(--widget-y, 50px);
            z-index: 50;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        }
        
        .widget-container {
            position: relative; /* Changed so title bar can be positioned absolutely */
            display: flex;
            flex-direction: column;
            filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
        }

        .title-bar {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 28px;
            background: rgba(30, 30, 40, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-bottom: none;
            border-radius: 12px 12px 0 0;
            display: flex;
            align-items: center;
            padding: 0 12px;
            cursor: grab;
            gap: 6px;
            
            opacity: var(--widget-edit-opacity, 0);
            pointer-events: var(--widget-edit-events, none);
            
            /* Sits directly above the content by default */
            transform: translateY(-100%);
            transition: opacity 0.3s ease, transform 0.2s ease, border-radius 0.2s ease;
            z-index: 100;
        }

        /* Triggered dynamically when near the top screen edge */
        .title-bar.shift-down {
            transform: translateY(0);
            border-radius: 12px; /* Turns into a floating pill over the content */
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .title-bar:active { cursor: grabbing; }

        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }

        .drag-grip {
            flex: 1; height: 100%; display: flex;
            align-items: center; justify-content: center;
        }
        .drag-grip::before {
            content: ''; width: 40px; height: 4px;
            border-radius: 2px; background: rgba(255,255,255,0.2);
        }

        .content-slot {
            border-radius: 12px;
            background: transparent; 
        }
    </style>

    <div class="widget-container">
        <div class="title-bar">
            <div class="dot red"></div>
            <div class="dot yellow"></div>
            <div class="dot green"></div>
            <div class="drag-grip"></div>
        </div>
        <div class="content-slot">
            <slot></slot>
        </div>
    </div>
`;

class WidgetWindow extends HTMLElement {
    static get observedAttributes() {
        return ['x', 'y'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(windowTemplate.content.cloneNode(true));

        this.titleBar = this.shadowRoot.querySelector('.title-bar');
        
        this.startDrag = this.startDrag.bind(this);
        this.doDrag = this.doDrag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.isDragging = false;
    }

    connectedCallback() {
        this.titleBar.addEventListener('pointerdown', this.startDrag);
        if (this.hasAttribute('x')) this.style.setProperty('--widget-x', `${this.getAttribute('x')}px`);
        if (this.hasAttribute('y')) {
            const y = parseFloat(this.getAttribute('y'));
            this.style.setProperty('--widget-y', `${y}px`);
            this.updateTitleBarPosition(y);
        }
    }

    disconnectedCallback() {
        this.titleBar.removeEventListener('pointerdown', this.startDrag);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'x') this.style.setProperty('--widget-x', `${newValue}px`);
        if (name === 'y') {
            const y = parseFloat(newValue);
            this.style.setProperty('--widget-y', `${y}px`);
            this.updateTitleBarPosition(y);
        }
    }

    updateTitleBarPosition(y) {
        if (!this.titleBar) return;
        // If the widget is within 30px of the top edge, slide the title bar inside
        if (y < 30) {
            this.titleBar.classList.add('shift-down');
        } else {
            this.titleBar.classList.remove('shift-down');
        }
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.initialX = parseFloat(this.getAttribute('x')) || 0;
        this.initialY = parseFloat(this.getAttribute('y')) || 0;
        
        window.addEventListener('pointermove', this.doDrag);
        window.addEventListener('pointerup', this.stopDrag);
    }

    doDrag(e) {
        if (!this.isDragging) return;

        let dx = e.clientX - this.startX;
        let dy = e.clientY - this.startY;

        // Power-user shortcuts: Lock axis
        if (e.shiftKey) dx = 0; // Shift locks horizontal (moves Y only)
        if (e.ctrlKey || e.metaKey) dy = 0; // Ctrl/Cmd locks vertical (moves X only)

        let newX = this.initialX + dx;
        let newY = this.initialY + dy;

        const width = this.offsetWidth;
        const height = this.offsetHeight;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // Snap Settings
        const SNAP = 20;
        const centerX = (screenW - width) / 2;
        const centerY = (screenH - height) / 2;

        // 1. Center Snapping
        if (Math.abs(newX - centerX) < SNAP) newX = centerX;
        if (Math.abs(newY - centerY) < SNAP) newY = centerY;

        // 2. Edge Snapping
        if (newX < SNAP) newX = 0;
        if (newX > screenW - width - SNAP) newX = screenW - width;
        if (newY < SNAP) newY = 0;
        if (newY > screenH - height - SNAP) newY = screenH - height;

        // 3. Absolute Screen Constraints (Hard limits so it never gets lost)
        newX = Math.max(0, Math.min(newX, screenW - width));
        newY = Math.max(0, Math.min(newY, screenH - height));

        // Setting attributes triggers attributeChangedCallback, applying CSS & titlebar logic
        this.setAttribute('x', newX);
        this.setAttribute('y', newY);
    }

    stopDrag(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        window.removeEventListener('pointermove', this.doDrag);
        window.removeEventListener('pointerup', this.stopDrag);

        this.dispatchEvent(new CustomEvent('widget-updated', {
            detail: { 
                id: this.id, 
                x: this.getAttribute('x'), 
                y: this.getAttribute('y') 
            },
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('widget-window', WidgetWindow);