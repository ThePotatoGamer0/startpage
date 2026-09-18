const clockTemplate = document.createElement('template');
clockTemplate.innerHTML = `
    <!-- Native Web Shader (SVG Filter) -->
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
        <defs>
            <filter id="optical-refraction" x="-20%" y="-20%" width="140%" height="140%">
                <!-- Generates smooth, wavy fluid noise -->
                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
                <!-- Uses the noise to mathematically push/pull the pixels of the text, creating a glass warping effect -->
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>
    </svg>

    <style>
        :host {
            display: block;
        }
        
        .clock-container {
            font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif;
            font-size: 6rem;
            font-weight: 500;
            letter-spacing: -3px;
            text-align: center;
            padding: 10px 30px;
            transition: all 0.3s ease;
        }

        /* --- Style 1: Solid --- */
        .style-solid {
            color: rgba(255, 255, 255, 0.95);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.95);
            filter: none;
        }

        /* --- Style 2: Apple Frosted Glass --- */
        .style-glass {
            background: linear-gradient(
                135deg, 
                rgba(255, 255, 255, 1) 0%, 
                rgba(255, 255, 255, 0.3) 30%, 
                rgba(255, 255, 255, 0.8) 70%, 
                rgba(255, 255, 255, 0.1) 100%
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.5);
            filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.4));
        }

        /* --- Style 3: Holographic Glass --- */
        .style-holo {
            background: linear-gradient(
                135deg, 
                rgba(255, 255, 255, 0.9) 0%, 
                rgba(255, 182, 255, 0.6) 35%, 
                rgba(182, 236, 255, 0.6) 65%, 
                rgba(255, 255, 255, 0.9) 100%
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.7);
            filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
        }

        /* --- Style 4: Refractive Warped Glass (The Shader) --- */
        .style-refractive {
            background: linear-gradient(
                135deg, 
                rgba(255, 255, 255, 0.9) 0%, 
                rgba(255, 255, 255, 0.1) 40%, 
                rgba(255, 255, 255, 0.7) 60%, 
                rgba(255, 255, 255, 0.2) 100%
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 2px rgba(255, 255, 255, 0.6);
            /* Applies the drop shadow AND routes the text through our SVG shader! */
            filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.5)) url('#optical-refraction');
        }

    </style>
    <div class="clock-container style-glass" id="timeDisplay">00:00</div>
`;

class WidgetClock extends HTMLElement {
    
    // Our dynamic settings page reads this to build the UI
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
                    type: 'select',
                    options: [
                        { value: 'glass', label: 'Frosted Glass' },
                        { value: 'refractive', label: 'Refractive (Warped)' },
                        { value: 'holo', label: 'Holographic' },
                        { value: 'solid', label: 'Solid White' }
                    ],
                    default: 'glass'
                }
            ]
        };
    }

    static get observedAttributes() {
        return ['timeformat', 'design'];
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
        }
    }

    updateDesign() {
        const design = this.getAttribute('design') || 'glass';
        this.timeDisplay.className = 'clock-container';
        this.timeDisplay.classList.add(`style-${design}`);
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