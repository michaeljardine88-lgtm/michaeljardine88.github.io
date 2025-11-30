// script.js — builds an interactive neural-network-like diagram

const networkData = [
    // --- Layer 1: Inputs (Skills) ---
    {
        id: 'layer-1',
        nodes: [
            { id: 'skill-py', label: 'Python Coding', targets: ['proc-data', 'proc-algo'] },
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
            nodeEl.setAttribute('data-targets', JSON.stringify(node.targets));
            nodeEl.innerText = node.label;

            // Hover: highlight connected lines + nodes
            nodeEl.addEventListener('mouseenter', () => highlightConnections(node.id));
            nodeEl.addEventListener('mouseleave', () => clearHighlights());

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
