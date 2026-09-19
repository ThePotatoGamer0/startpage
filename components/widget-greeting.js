const greetingTemplate = document.createElement('template');
greetingTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            --greeting-color: #ffffff;
            --greeting-size: 3rem;
        }
        
        .greeting-container {
            font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif;
            font-size: var(--greeting-size);
            font-weight: 500;
            letter-spacing: calc(var(--greeting-size) * -0.03);
            text-align: center;
            padding: calc(var(--greeting-size) * 0.2) calc(var(--greeting-size) * 0.4);
            line-height: 1.2;
            white-space: nowrap;
        }

        /* --- Style 1: Solid Color --- */
        .style-solid {
            color: var(--greeting-color);
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            -webkit-text-stroke: 0;
            background: none;
            -webkit-text-fill-color: var(--greeting-color);
        }

        /* --- Style 2: Knockout Glass --- */
        .style-knockout {
            background: color-mix(in srgb, var(--greeting-color) 15%, transparent);
            backdrop-filter: blur(20px) saturate(150%);
            -webkit-backdrop-filter: blur(20px) saturate(150%);
            
            -webkit-background-clip: text;
            background-clip: text;
            
            color: transparent;
            -webkit-text-fill-color: transparent;
            
            -webkit-text-stroke: 0;
            text-shadow: 
                -1.5px -1.5px 0 color-mix(in srgb, var(--greeting-color) 60%, transparent),
                 1.5px -1.5px 0 color-mix(in srgb, var(--greeting-color) 60%, transparent),
                -1.5px  1.5px 0 color-mix(in srgb, var(--greeting-color) 60%, transparent),
                 1.5px  1.5px 0 color-mix(in srgb, var(--greeting-color) 60%, transparent),
                 0 10px 25px rgba(0, 0, 0, 0.4);
        }
    </style>
    <div class="greeting-container style-knockout" id="greetingDisplay">Hello, World</div>
`;

class WidgetGreeting extends HTMLElement {
    
    static get widgetConfig() {
        return {
            id: 'greeting',                 
            tag: 'widget-greeting',         
            name: 'Greeting Widget',        
            fields: [
                {
                    id: 'username',
                    label: 'Your Name / Username',
                    type: 'text',
                    placeholder: 'e.g. Potato',
                    default: 'Friend'
                },
                {
                    id: 'design',
                    label: 'Typography Style',
                    type: 'segmented',
                    options: [
                        { value: 'knockout', label: 'Knockout Glass' },
                        { value: 'solid', label: 'Solid Color' }
                    ],
                    default: 'knockout'
                },
                {
                    id: 'textcolor',
                    label: 'Text Color',
                    type: 'color',
                    default: '#ffffff'
                },
                {
                    id: 'fontsize',
                    label: 'Scale (rem)',
                    type: 'range',
                    min: '1.5',
                    max: '6',
                    step: '0.5',
                    default: '3'
                }
            ]
        };
    }

    static get observedAttributes() {
        return ['username', 'design', 'textcolor', 'fontsize'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(greetingTemplate.content.cloneNode(true));
        this.greetingDisplay = this.shadowRoot.getElementById('greetingDisplay');
        this.checkInterval = null;
    }

    connectedCallback() {
        this.updateGreeting();
        this.updateDesign();
        this.updateColor();
        this.updateSize();

        // Check every minute in case the time block changes
        this.checkInterval = setInterval(() => this.updateGreeting(), 60000);
    }

    disconnectedCallback() {
        if (this.checkInterval) clearInterval(this.checkInterval);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        if (name === 'username') {
            this.updateGreeting(); 
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
        this.greetingDisplay.className = 'greeting-container';
        this.greetingDisplay.classList.add(`style-${design}`);
    }

    updateColor() {
        const color = this.getAttribute('textcolor') || '#ffffff';
        this.style.setProperty('--greeting-color', color);
    }

    updateSize() {
        const size = this.getAttribute('fontsize') || '3';
        this.style.setProperty('--greeting-size', `${size}rem`);
    }

    getGreetingForTime() {
        const hour = new Date().getHours();
        const username = this.getAttribute('username') || 'Friend';

        const pools = {
            night: [
                `Up late, ${username}?`,
                `Burning the midnight oil, ${username}?`,
                `The night is young, ${username}.`,
                `Quiet hours, ${username}.`,
                `Rest well soon, ${username}.`,
                `Stargazing, ${username}?`
            ],
            dawn: [
                `Early bird, ${username}!`,
                `The world is asleep, ${username}.`,
                `Before the sun rises, ${username}.`,
                `A fresh dawn, ${username}.`,
                `Peaceful morning, ${username}.`,
                `Up with the stars, ${username}?`
            ],
            morning: [
                `Good morning, ${username}!`,
                `Rise and shine, ${username}.`,
                `Ready to conquer the day, ${username}?`,
                `Grab some coffee, ${username}.`,
                `A bright morning to you, ${username}.`,
                `Let's get to work, ${username}.`
            ],
            lateMorning: [
                `Productive hours, ${username}?`,
                `In the zone, ${username}?`,
                `Making progress, ${username}?`,
                `Keep the momentum going, ${username}.`,
                `Almost lunchtime, ${username}.`,
                `Flow state active, ${username}.`
            ],
            afternoon: [
                `Good afternoon, ${username}!`,
                `Afternoon slump or second wind, ${username}?`,
                `Stay hydrated, ${username}!`,
                `Halfway through the day, ${username}.`,
                `Keep pushing forward, ${username}.`,
                `Afternoon focus, ${username}.`
            ],
            lateAfternoon: [
                `Wrapping up soon, ${username}?`,
                `The afternoon golden hour, ${username}.`,
                `You've done a lot today, ${username}.`,
                `Home stretch, ${username}!`,
                `Evening approaching, ${username}.`,
                `Final push, ${username}.`
            ],
            evening: [
                `Good evening, ${username}!`,
                `Time to unwind, ${username}.`,
                `How was your day, ${username}?`,
                `Relax and breathe, ${username}.`,
                `Evening vibes, ${username}.`,
                `Disconnecting soon, ${username}?`
            ],
            nightOwl: [
                `Winding down, ${username}?`,
                `Late night chilling, ${username}.`,
                `Reflecting on the day, ${username}.`,
                `Almost bedtime, ${username}.`,
                `Peaceful evening, ${username}.`,
                `Rest up for tomorrow, ${username}.`
            ]
        };

        let currentPool;
        if (hour >= 0 && hour < 3) currentPool = pools.night;
        else if (hour >= 3 && hour < 6) currentPool = pools.dawn;
        else if (hour >= 6 && hour < 9) currentPool = pools.morning;
        else if (hour >= 9 && hour < 12) currentPool = pools.lateMorning;
        else if (hour >= 12 && hour < 15) currentPool = pools.afternoon;
        else if (hour >= 15 && hour < 18) currentPool = pools.lateAfternoon;
        else if (hour >= 18 && hour < 21) currentPool = pools.evening;
        else currentPool = pools.nightOwl;

        const daySeed = Math.floor(new Date().getTime() / (1000 * 60 * 90));
        const index = daySeed % currentPool.length;
        
        return currentPool[index];
    }

    updateGreeting() {
        this.greetingDisplay.innerText = this.getGreetingForTime();
    }
}

customElements.define('widget-greeting', WidgetGreeting);