const clockTemplate = document.createElement('template');
clockTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            /* Default color variable that JS will update */
            --clock-color: #ffffff;
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

        /* --- Style 1: Solid Color --- */
        .style-solid {
            color: var(--clock-color);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: var(--clock-color);
        }

        /* --- Style 2: Knockout Glass --- */
        .style-knockout {
            /* Uses color-mix to intelligently tint the glass based on the chosen color! */
            background: color-mix(in srgb, var(--clock-color) 15%, transparent);
            backdrop-filter: blur(20px) saturate(150%);
            -webkit-backdrop-filter: blur(20px) saturate(150%);
            
            -webkit-background-clip: text;
            background-clip: text;
            
            color: transparent;
            -webkit-text-fill-color: transparent;
            
            /* Tints the glass rim/stroke */
            -webkit-text-stroke: 1.5px color-mix(in srgb, var(--clock-color) 60%, transparent);
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
                    type: 'segmented', // Changed to segmented since there are only 2 options!
                    options: [
                        { value: 'knockout', label: 'Knockout Glass' },
                        { value: 'solid', label: 'Solid Color' }
                    ],
                    default: 'knockout'
                },
                {
                    id: 'textcolor',
                    label: 'Clock Color',
                    type: 'color', // Triggers the native color picker in settings.js
                    default: '#ffffff'
                }
            ]
        };
    }

    static get observedAttributes() {
        return ['timeformat', 'design', 'textcolor'];
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
        }
    }

    updateDesign() {
        const design = this.getAttribute('design') || 'knockout';
        this.timeDisplay.className = 'clock-container';
        this.timeDisplay.classList.add(`style-${design}`);
    }

    updateColor() {
        const color = this.getAttribute('textcolor') || '#ffffff';
        // Passes the color down into the CSS variable
        this.style.setProperty('--clock-color', color);
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