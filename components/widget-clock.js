const clockTemplate = document.createElement('template');
clockTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            --clock-color: #ffffff;
            --clock-size: 6rem;
        }
        
        .clock-container {
            font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif;
            font-size: var(--clock-size);
            font-weight: 500;
            letter-spacing: calc(var(--clock-size) * -0.05);
            text-align: center;
            padding: calc(var(--clock-size) * 0.1) calc(var(--clock-size) * 0.3);
            line-height: 1;
        }

        /* --- Style 1: Solid Color --- */
        .style-solid {
            color: var(--clock-color);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: var(--clock-color);
            mix-blend-mode: normal;
        }

        /* --- Style 2: Pure Lens Stencil --- */
        .style-knockout {
            /* We use a slight transparency mixed with the color picker value */
            color: color-mix(in srgb, var(--clock-color) 75%, transparent);
            -webkit-text-fill-color: color-mix(in srgb, var(--clock-color) 75%, transparent);
            
            /* The Magic: Overlay forces the text to blend and bend the contrast of the wallpaper behind it */
            mix-blend-mode: overlay;
            
            /* Pure stencil: Zero backgrounds, strokes, or shadows */
            background: none;
            -webkit-background-clip: unset;
            background-clip: unset;
            backdrop-filter: none;
            -webkit-text-stroke: 0;
            text-shadow: none;
            filter: none;
        }

    </style>
    <div class="clock-container style-knockout" id="timeDisplay">00:00</div>
`;

class WidgetClock extends HTMLElement {
    
    static get widgetConfig() {
        return {
            id: 'clock',                 
            tag: 'widget-clock',         
            name: 'Clock Widget',        
            fields: [
                {
                    id: 'timeformat',
                    label: 'Time Format',
                    type: 'segmented',
                    options: [
                        { value: '24', label: '24-Hour' },
                        { value: '12', label: '12-Hour' }
                    ],
                    default: '24'
                },
                {
                    id: 'design',
                    label: 'Typography Style',
                    type: 'segmented',
                    options: [
                        { value: 'knockout', label: 'Lens Stencil' },
                        { value: 'solid', label: 'Solid Color' }
                    ],
                    default: 'knockout'
                },
                {
                    id: 'textcolor',
                    label: 'Clock Color',
                    type: 'color',
                    default: '#ffffff'
                },
                {
                    id: 'fontsize',
                    label: 'Scale (rem)',
                    type: 'range',
                    min: '2',
                    max: '12',
                    step: '0.5',
                    default: '6'
                }
            ]
        };
    }

    static get observedAttributes() {
        return ['timeformat', 'design', 'textcolor', 'fontsize'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(clockTemplate.content.cloneNode(true));
        this.timeDisplay = this.shadowRoot.getElementById('timeDisplay');
        this.clockInterval = null;
    }

    connectedCallback() {
        this.startClock();
        this.updateDesign();
        this.updateColor();
        this.updateSize();
    }

    disconnectedCallback() {
        if (this.clockInterval) clearInterval(this.clockInterval);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        if (name === 'timeformat') {
            this.updateTime(); 
        } else if (name === 'design') {
            this.updateDesign();
        } else if (name === 'textcolor') {
            this.updateColor();
        } else if (name === 'fontsize') {
            this.updateSize();
        }
    }

    updateDesign() {
        const design = this.getAttribute('design') || 'knockout';
        this.timeDisplay.className = 'clock-container';
        this.timeDisplay.classList.add(`style-${design}`);
    }

    updateColor() {
        const color = this.getAttribute('textcolor') || '#ffffff';
        this.style.setProperty('--clock-color', color);
    }

    updateSize() {
        const size = this.getAttribute('fontsize') || '6';
        this.style.setProperty('--clock-size', `${size}rem`);
    }

    startClock() {
        this.updateTime();
        this.clockInterval = setInterval(() => this.updateTime(), 1000);
    }

    updateTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = String(now.getMinutes()).padStart(2, '0');
        const format = this.getAttribute('timeformat') || '24';
        
        if (format === '12') {
            hours = hours % 12 || 12;
        }
        
        hours = String(hours).padStart(2, '0');
        this.timeDisplay.innerText = `${hours}:${minutes}`;
    }
}

customElements.define('widget-clock', WidgetClock);