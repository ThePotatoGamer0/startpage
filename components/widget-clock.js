const clockTemplate = document.createElement('template');
clockTemplate.innerHTML = `
    <style>
        :host {
            display: block;
        }
        .clock-container {
            color: rgba(255, 255, 255, 0.9);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            font-weight: 300;
            font-size: 5rem;
            font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 10px 30px;
            letter-spacing: -2px;
        }
    </style>
    <div class="clock-container" id="timeDisplay">00:00</div>
`;

class WidgetClock extends HTMLElement {
    
    // --- The Settings Schema ---
    // The settings page reads this object to dynamically build the UI
    static get widgetConfig() {
        return {
            id: 'clock',                 // Used for saving to localStorage (e.g. sp_widget_clock_config)
            tag: 'widget-clock',         // The custom element tag name
            name: 'Clock Widget',        // The display name in the dropdown
            fields: [
                {
                    id: 'timeformat',
                    label: 'Time Format',
                    type: 'select',
                    options: [
                        { value: '24', label: '24-Hour (23:59)' },
                        { value: '12', label: '12-Hour (11:59 PM)' }
                    ],
                    default: '24'
                }
            ]
        };
    }

    static get observedAttributes() {
        return ['timeformat'];
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
    }

    disconnectedCallback() {
        if (this.clockInterval) clearInterval(this.clockInterval);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && name === 'timeformat') {
            this.updateTime(); 
        }
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