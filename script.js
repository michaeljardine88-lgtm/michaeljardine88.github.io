// script.js — builds an interactive neural-network-like diagram

const networkData = [
    // --- Layer 1: Inputs (Skills) ---
    {
        id: 'layer-1',
        nodes: [
            // Add a connection from Python Coding to Model Training so hovering Python
            // also highlights and draws a line to the Model Training node.
            { id: 'skill-py', label: 'Python Coding', targets: ['proc-data', 'proc-algo', 'proc-model'] },
            { id: 'skill-ml', label: 'Machine Learning', targets: ['proc-algo', 'proc-model'] },
            { id: 'skill-strat', label: 'Strategic Planning', targets: ['proc-ws', 'proc-change'] }
        ]
    },
    
    // --- Layer 2: Hidden (Methodology) ---
    {
        id: 'layer-2',
        nodes: [
            { id: 'proc-data', label: 'Data Cleaning', targets: ['res-eff'] },
            { id: 'proc-algo', label: 'Algorithm Design', targets: ['res-model', 'res-rev'] },
            { id: 'proc-model', label: 'Model Training', targets: ['res-model'] },
            { id: 'proc-ws', label: 'Client Workshops', targets: ['res-change'] },
            { id: 'proc-change', label: 'Change Mgmt', targets: ['res-eff', 'res-change'] }
        ]
    },

    // --- Layer 3: Output (Results) ---
    {
        id: 'layer-3',
        nodes: [
            { id: 'res-eff', label: '20% Efficiency Gain', targets: [] }, // No targets for final layer
            { id: 'res-model', label: 'Deployed Model', targets: [] },
            { id: 'res-rev', label: '$2M Revenue Increase', targets: [] },
            { id: 'res-change', label: 'Org Transformation', targets: [] }
        ]
    }
];

/**
 * Build DOM nodes for each layer/node using the `networkData` object.
 * After nodes are added to the DOM we call drawConnections() which calculates
 * positions and paints SVG lines between node centers.
 */
function buildNetwork() {
    const layersContainer = document.getElementById('layers-container');
    const svg = document.getElementById('connections-layer');

    if (!layersContainer || !svg) return;

    layersContainer.innerHTML = '';
    // Create column for each layer
    networkData.forEach(layer => {
        const col = document.createElement('div');
        col.className = 'column';
        col.id = layer.id;

        layer.nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'node';
            nodeEl.setAttribute('data-id', node.id);
            // give the element a DOM id as well for easier lookup (matches the suggested pattern)
            nodeEl.id = node.id;
            nodeEl.setAttribute('data-targets', JSON.stringify(node.targets));
            nodeEl.innerText = node.label;

            // Hover: highlight the forward-flowing path recursively (phase 2 behaviour)
            nodeEl.addEventListener('mouseenter', () => highlightPathRecursive(node.id, true));
            nodeEl.addEventListener('mouseleave', () => highlightPathRecursive(node.id, false));

            // Click toggles 'active' state (persistently highlight)
            nodeEl.addEventListener('click', (e) => {
                e.stopPropagation(); // don't let clicks bubble to the container
                nodeEl.classList.toggle('active');
                // ensure connected lines highlight when active
                updateActiveConnections();
            });

            col.appendChild(nodeEl);
        });

        layersContainer.appendChild(col);
    });

    // Re-draw connections as soon as the DOM is painted (so sizes are up-to-date)
    requestAnimationFrame(drawConnections);
}

/** Draw SVG lines between source and target node centers. */
function drawConnections() {
    const svg = document.getElementById('connections-layer');
    if (!svg) return;

    // clear existing paths/lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // gather svg bounding rect for coordinate conversion
    const svgRect = svg.getBoundingClientRect();

    // create one <line> per connection in networkData
    networkData.forEach(layer => {
        layer.nodes.forEach(node => {
            const srcEl = document.querySelector(`[data-id='${cssEscape(node.id)}']`);
            if (!srcEl) return;
            const srcRect = srcEl.getBoundingClientRect();
            const srcCx = srcRect.left + srcRect.width / 2 - svgRect.left;
            const srcCy = srcRect.top + srcRect.height / 2 - svgRect.top;

            node.targets.forEach(targetId => {
                const targetEl = document.querySelector(`[data-id='${cssEscape(targetId)}']`);
                if (!targetEl) return;
                const trgRect = targetEl.getBoundingClientRect();
                const trgCx = trgRect.left + trgRect.width / 2 - svgRect.left;
                const trgCy = trgRect.top + trgRect.height / 2 - svgRect.top;

                const line = document.createElementNS('http://www.w3.org/2000/svg','line');
                line.setAttribute('x1', srcCx);
                line.setAttribute('y1', srcCy);
                line.setAttribute('x2', trgCx);
                line.setAttribute('y2', trgCy);
                line.setAttribute('data-source', node.id);
                line.setAttribute('data-target', targetId);
                // give the SVG a unique id for quick selection like "sourceId-targetId"
                line.id = `${node.id}-${targetId}`;
                line.classList.add('connection');
                svg.appendChild(line);
            });
        });
    });

    // after drawing, ensure any nodes that are active have their connections highlighted
    updateActiveConnections();
}

/** Highlight visual connections for a node (used on hover). */
function highlightConnections(nodeId) {
    const svg = document.getElementById('connections-layer');
    if (!svg) return;
    const lines = svg.querySelectorAll('line');

    lines.forEach(line => {
        if (line.dataset.source === nodeId || line.dataset.target === nodeId) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });

    // Also highlight immediate nodes connected to it
    document.querySelectorAll('.node').forEach(n => n.classList.toggle('active-highlight', connected(n, nodeId)));
}

/**
 * Recursive highlight used by Phase 2 behavior: when a node is hovered we
 * light the outgoing lines and nodes forward until the final layer.
 * This mirrors the example you pasted and makes the forward flow obvious.
 */
function highlightPathRecursive(nodeId, isActive) {
    const node = document.getElementById(nodeId);
    if (!node) return;

    // toggle the node itself
    if (isActive) node.classList.add('active');
    else node.classList.remove('active');

    // parse downstream targets (if any)
    let targets = [];
    try { targets = JSON.parse(node.dataset.targets || '[]'); } catch (e) { targets = []; }

    targets.forEach(targetId => {
        // highlight the connecting line by ID (format: "source-target")
        const line = document.getElementById(`${nodeId}-${targetId}`);
        if (line) {
            if (isActive) line.classList.add('active');
            else line.classList.remove('active');
        }

        // recurse into the target node so the whole forward path lights up
        highlightPathRecursive(targetId, isActive);
    });
}

/** Check if nodeElement is connected to nodeId (either as source or target). */
function connected(nodeElement, nodeId) {
    try {
        const id = nodeElement.getAttribute('data-id');
        // find any line connecting id ⇄ nodeId
        const svg = document.getElementById('connections-layer');
        if (!svg) return false;
        return !!svg.querySelector(`line[data-source='${CSS.escape(id)}'][data-target='${CSS.escape(nodeId)}'], line[data-source='${CSS.escape(nodeId)}'][data-target='${CSS.escape(id)}']`);
    } catch (e) {
        return false;
    }
}

/** Clear hover highlights */
function clearHighlights() {
    const svg = document.getElementById('connections-layer');
    if (!svg) return;
    svg.querySelectorAll('line').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active-highlight'));
    updateActiveConnections();
}

/** Mark connections for nodes currently toggled .active */
function updateActiveConnections() {
    const svg = document.getElementById('connections-layer');
    if (!svg) return;
    const lines = svg.querySelectorAll('line');
    const activeNodes = Array.from(document.querySelectorAll('.node.active')).map(n => n.getAttribute('data-id'));

    if (activeNodes.length === 0) {
        // remove any forced visibility
        lines.forEach(l => l.classList.remove('active'));
        return;
    }

    lines.forEach(line => {
        // highlight if either endpoint is an active node
        if (activeNodes.includes(line.dataset.source) || activeNodes.includes(line.dataset.target)) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

// utility: CSS.escape fallback for older browsers
function cssEscape(id) {
    if (window.CSS && CSS.escape) return CSS.escape(id);
    return id.replace(/([ #;?\/:@&=+,$~%.'"*\[\]\(\)\|<>^\\])/g, '\\$1');
}

// Recompute layout on window resize so lines stay connected
let resizeTimeout = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => requestAnimationFrame(drawConnections), 120);
});

// clicking anywhere outside nodes should clear active highlights
window.addEventListener('click', (e) => {
    if (!e.target.closest('.node')) {
        document.querySelectorAll('.node.active').forEach(n => n.classList.remove('active'));
        updateActiveConnections();
    }
});

// Build the network once the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNetwork);
} else {
    buildNetwork();
}

// Build starfield galaxy animation in background
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];
let width, height;

// star color palette (RGB values) — use the provided metallic tones
const STAR_PALETTE = [
    { r: 255, g: 150, b: 160 }, // Metallic Red / Rose Gold
    { r: 170, g: 220, b: 255 }, // Metallic Blue / Ice Steel
    { r: 255, g: 240, b: 150 }, // Metallic Yellow / Champagne
    { r: 150, g: 255, b: 200 }  // Metallic Green / Mint Alloy
];

// 1. Setup the Canvas Size
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    createStars();
}
// 2. The Star Class (the blueprint)
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        // position stars randomly across the whole canvas so they don't "fall"
        this.x = Math.random() * width;
        this.y = Math.random() * height;

        // base size and alpha — used as centers for twinkling oscillations
        this.baseZ = Math.random() * 1.8 + 0.5; // radius
        this.z = this.baseZ;
        this.baseAlpha = Math.random() * 0.6 + 0.2; // 0.2 - 0.8
        this.alpha = this.baseAlpha;

        // per-star color chosen from the metallic palette
        const col = STAR_PALETTE[Math.floor(Math.random() * STAR_PALETTE.length)];
        // store as template-ready values to avoid doing this every frame
        this.colorR = col.r;
        this.colorG = col.g;
        this.colorB = col.b;

        // twinkle controls (different speed/phase per star)
        this.twinkleSpeed = Math.random() * 0.9 + 0.3; // cycles / second-ish
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.twinkleAmp = Math.random() * 0.6 + 0.15; // how strong the twinkle is
    }

    update() {
        // twinkle: oscillate alpha and size based on time (no vertical movement)
        const t = performance.now() * 0.001; // seconds
        const omega = this.twinkleSpeed * 2 * Math.PI; // convert cycles/sec to rad/sec
        const sine = Math.sin(omega * t + this.twinklePhase);

        // alpha oscillates around baseAlpha
        this.alpha = this.baseAlpha + sine * this.twinkleAmp;
        this.alpha = Math.max(0, Math.min(1, this.alpha));

        // radius slightly pulsates for extra depth
        this.z = this.baseZ + sine * (this.baseZ * 0.35);
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.z, 0, Math.PI * 2);
        // use the per-star RGB values and current alpha so stars flicker in color
        ctx.fillStyle = `rgba(${this.colorR}, ${this.colorG}, ${this.colorB}, ${this.alpha})`;
        ctx.fill();
    }
}

// 3. Create the fleet of stars

function createStars() {
    stars = [];
    const starCount = 200;

    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

// 4. Animate Stars

function animateStars() {
    ctx.clearRect(0, 0, width, height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });
    requestAnimationFrame(animateStars);
}

// Initialize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateStars();