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
            display: flex;
            flex-direction: column;
            filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
        }

        .title-bar {
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
            transition: opacity 0.3s ease;
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
            border-radius: 0 0 12px 12px;
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
            <slot></slot> <!-- External content gets projected here -->
        </div>
    </div>
`;

class WidgetWindow extends HTMLElement {
    static get observedAttributes() {
        return ['x', 'y']; // Only cares about coordinates
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
        if (this.hasAttribute('y')) this.style.setProperty('--widget-y', `${this.getAttribute('y')}px`);
    }

    disconnectedCallback() {
        this.titleBar.removeEventListener('pointerdown', this.startDrag);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'x') this.style.setProperty('--widget-x', `${newValue}px`);
        if (name === 'y') this.style.setProperty('--widget-y', `${newValue}px`);
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
        const newX = this.initialX + (e.clientX - this.startX);
        const newY = this.initialY + (e.clientY - this.startY);
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
                id: this.id, // Emits its ID so the main page knows which widget moved
                x: this.getAttribute('x'), 
                y: this.getAttribute('y') 
            },
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('widget-window', WidgetWindow);