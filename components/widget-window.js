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
            position: relative;
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
            
            transform: translateY(-100%);
            transition: opacity 0.3s ease, transform 0.2s ease, border-radius 0.2s ease;
            z-index: 100;
        }

        .title-bar.shift-down {
            transform: translateY(0);
            border-radius: 12px;
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
        return ['x-ratio', 'y-ratio'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(windowTemplate.content.cloneNode(true));

        this.titleBar = this.shadowRoot.querySelector('.title-bar');
        this.slotElement = this.shadowRoot.querySelector('slot');
        
        this.startDrag = this.startDrag.bind(this);
        this.doDrag = this.doDrag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        this.isDragging = false;
        this.resizeObserver = null;
    }

    connectedCallback() {
        this.titleBar.addEventListener('pointerdown', this.startDrag);
        window.addEventListener('resize', this.handleResize);

        // Watch the assigned slot elements for size changes (e.g. font scale changes)
        this.slotElement.addEventListener('slotchange', () => {
            const assigned = this.slotElement.assignedElements();
            if (assigned.length > 0) {
                this.observeContent(assigned[0]);
            }
        });

        this.updatePositionFromRatios();
    }

    observeContent(el) {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.isDragging) {
                this.updatePositionFromRatios();
            }
        });
        
        this.resizeObserver.observe(el);
    }

    disconnectedCallback() {
        this.titleBar.removeEventListener('pointerdown', this.startDrag);
        window.removeEventListener('resize', this.handleResize);
        if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this.updatePositionFromRatios();
    }

    updatePositionFromRatios() {
        const xRatio = parseFloat(this.getAttribute('x-ratio'));
        const yRatio = parseFloat(this.getAttribute('y-ratio'));
        
        if (isNaN(xRatio) || isNaN(yRatio)) return;

        const width = this.offsetWidth || 200;
        const height = this.offsetHeight || 100;

        const maxX = Math.max(1, window.innerWidth - width);
        const maxY = Math.max(1, window.innerHeight - height);

        let pixelX = xRatio * maxX;
        let pixelY = yRatio * maxY;

        pixelX = Math.max(0, Math.min(pixelX, maxX));
        pixelY = Math.max(0, Math.min(pixelY, maxY));

        this.style.setProperty('--widget-x', `${pixelX}px`);
        this.style.setProperty('--widget-y', `${pixelY}px`);
        this.updateTitleBarPosition(pixelY);
    }

    handleResize() {
        if (!this.isDragging) {
            this.updatePositionFromRatios();
        }
    }

    updateTitleBarPosition(y) {
        if (!this.titleBar) return;
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
        
        const currentX = parseFloat(this.style.getPropertyValue('--widget-x')) || 0;
        const currentY = parseFloat(this.style.getPropertyValue('--widget-y')) || 0;
        this.initialX = currentX;
        this.initialY = currentY;
        
        window.addEventListener('pointermove', this.doDrag);
        window.addEventListener('pointerup', this.stopDrag);
    }

    doDrag(e) {
        if (!this.isDragging) return;

        let dx = e.clientX - this.startX;
        let dy = e.clientY - this.startY;

        if (e.shiftKey) dx = 0; 
        if (e.ctrlKey || e.metaKey) dy = 0; 

        let newX = this.initialX + dx;
        let newY = this.initialY + dy;

        const width = this.offsetWidth;
        const height = this.offsetHeight;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const SNAP = 20;
        const centerX = (screenW - width) / 2;
        const centerY = (screenH - height) / 2;

        if (Math.abs(newX - centerX) < SNAP) newX = centerX;
        if (Math.abs(newY - centerY) < SNAP) newY = centerY;

        if (newX < SNAP) newX = 0;
        if (newX > screenW - width - SNAP) newX = screenW - width;
        if (newY < SNAP) newY = 0;
        if (newY > screenH - height - SNAP) newY = screenH - height;

        newX = Math.max(0, Math.min(newX, screenW - width));
        newY = Math.max(0, Math.min(newY, screenH - height));

        this.style.setProperty('--widget-x', `${newX}px`);
        this.style.setProperty('--widget-y', `${newY}px`);
        this.updateTitleBarPosition(newY);
    }

    stopDrag(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        window.removeEventListener('pointermove', this.doDrag);
        window.removeEventListener('pointerup', this.stopDrag);

        let currentX = parseFloat(this.style.getPropertyValue('--widget-x')) || 0;
        let currentY = parseFloat(this.style.getPropertyValue('--widget-y')) || 0;

        const width = this.offsetWidth;
        const height = this.offsetHeight;

        const maxX = Math.max(1, window.innerWidth - width);
        const maxY = Math.max(1, window.innerHeight - height);

        const xRatio = currentX / maxX;
        const yRatio = currentY / maxY;

        this.setAttribute('x-ratio', xRatio);
        this.setAttribute('y-ratio', yRatio);

        this.dispatchEvent(new CustomEvent('widget-updated', {
            detail: { 
                id: this.id, 
                xRatio: xRatio, 
                yRatio: yRatio 
            },
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('widget-window', WidgetWindow);