const clockTemplate = document.createElement('template');
clockTemplate.innerHTML = `
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

        /* --- Style 1: Solid White --- */
        .style-solid {
            color: rgba(255, 255, 255, 0.95);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.95);
        }

        /* --- Style 2: Frosted Gradient --- */
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
            mix-blend-mode: normal;
        }

        /* --- Style 3: Apple Vibrancy (Overlay) --- */
        .style-vibrancy {
            color: rgba(255, 255, 255, 0.4);
            mix-blend-mode: overlay;
            -webkit-text-stroke: 2px rgba(255, 255, 255, 0.6);
            filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
            background: none;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.4);
        }

        /* --- Style 4: Glass Lens (Color Dodge) --- */
        .style-lens {
            color: rgba(255, 255, 255, 0.15);
            mix-blend-mode: color-dodge;
            -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.8);
            filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
            background: none;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.15);
        }

        /* --- Style 5: True Knockout Glass --- */
        .style-knockout {
            /* 1. Create the frosted glass base */
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px) saturate(150%);
            -webkit-backdrop-filter: blur(20px) saturate(150%);
            
            /* 2. Clip the background AND the blur to the text vector shape */
            -webkit-background-clip: text;
            background-clip: text;
            
            /* 3. Hide the actual text color to reveal the blurred background inside */
            color: transparent;
            -webkit-text-fill-color: transparent;
            
            /* 4. Add the thick glass rim */
            -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.6);
            filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.4));
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
                    type: 'select',
                    options: [
                        { value: 'knockout', label: 'Knockout Glass (True Blur)' },
                        { value: 'vibrancy', label: 'Apple Vibrancy (Overlay)' },
                        { value: 'lens', label: 'Glass Lens (Color Dodge)' },
                        { value: 'glass', label: 'Frosted Gradient' },
                        { value: 'solid', label: 'Solid White' }
                    ],
                    default: 'knockout'
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
        const design = this.getAttribute('design') || 'knockout';
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