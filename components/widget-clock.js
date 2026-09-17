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

        /* --- Style 1: Solid (Standard) --- */
        .style-solid {
            color: rgba(255, 255, 255, 0.95);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.95);
        }

        /* --- Style 2: Apple Frosted Glass --- */
        .style-glass {
            /* Simulates light reflecting across the surface of the text */
            background: linear-gradient(
                135deg, 
                rgba(255, 255, 255, 1) 0%, 
                rgba(255, 255, 255, 0.3) 30%, 
                rgba(255, 255, 255, 0.8) 70%, 
                rgba(255, 255, 255, 0.1) 100%
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            
            /* Simulates the physical refractive edge of carved glass */
            -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.5);
            
            /* Lifts the glass off the background */
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
                    type: 'segmented', // Uses the new macOS pill control we built!
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
                        { value: 'solid', label: 'Solid White' },
                        { value: 'holo', label: 'Holographic' }
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
        // Strip out any existing style classes
        this.timeDisplay.className = 'clock-container';
        // Apply the newly selected style
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