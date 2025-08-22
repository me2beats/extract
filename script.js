const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const nodes = [];
const connections = [];

// Create the output node by default
const outputNode = {
    id: 'output', // Fixed ID for the permanent output node
    type: 'output',
    x: 700,
    y: 200,
    width: 150,
    height: 80,
    inputs: [{ name: 'in' }],
    outputs: []
};
nodes.push(outputNode);


let draggingNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let connectingNode = null;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let potentialDragNode = null;
let isPotentialDrag = false;
let startX = 0;
let startY = 0;
const DRAG_THRESHOLD = 5;

function resizeCanvas() {
    canvas.width = window.innerWidth - 170;
    canvas.height = window.innerHeight;
    draw();
}

window.addEventListener('resize', resizeCanvas);

const sidebarNodes = document.querySelectorAll('.node[draggable="true"]');

sidebarNodes.forEach(node => {
    node.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.type);
    });

    node.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const type = e.target.dataset.type;
        const touch = e.touches[0];
        const ghostNode = e.target.cloneNode(true);
        ghostNode.style.position = 'absolute';
        ghostNode.style.left = (touch.clientX - 50) + 'px';
        ghostNode.style.top = (touch.clientY - 25) + 'px';
        ghostNode.id = 'ghost-node';
        document.body.appendChild(ghostNode);

        const touchMove = (e) => {
            const touch = e.touches[0];
            ghostNode.style.left = (touch.clientX - 50) + 'px';
            ghostNode.style.top = (touch.clientY - 25) + 'px';
        };

        const touchEnd = (e) => {
            document.removeEventListener('touchmove', touchMove);
            document.removeEventListener('touchend', touchEnd);
            document.body.removeChild(ghostNode);
            const touch = e.changedTouches[0];
            const canvasRect = canvas.getBoundingClientRect();
            if (touch.clientX > canvasRect.left && touch.clientX < canvasRect.right &&
                touch.clientY > canvasRect.top && touch.clientY < canvasRect.bottom) {
                const x = touch.clientX - canvas.offsetLeft;
                const y = touch.clientY - canvas.offsetTop;
                createNode(type, x, y);
            }
        };

        document.addEventListener('touchmove', touchMove);
        document.addEventListener('touchend', touchEnd);
    });
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    createNode(type, x, y);
});


function createSineWaveSubgraph() {
    const subgraphNodes = [];
    const subgraphConnections = [];
    let nodeId = 0;

    // Create nodes
    const const2Pi = { id: nodeId++, type: 'constant', value: 2 * Math.PI, x: 50, y: 50, inputs:[], outputs: [{name: 'out'}] };
    const mult1 = { id: nodeId++, type: 'multiply', x: 200, y: 50, inputs:[{name: 'in1'}, {name: 'in2'}], outputs: [{name: 'out'}] };
    const mult2 = { id: nodeId++, type: 'multiply', x: 200, y: 150, inputs:[{name: 'in1'}, {name: 'in2'}], outputs: [{name: 'out'}] };
    const sin = { id: nodeId++, type: 'sin', x: 350, y: 100, inputs:[{name: 'in'}], outputs: [{name: 'out'}] };

    // subgraph input nodes
    const freqInput = { id: 'freq', type: 'subgraph-input', x: 0, y: 100, outputs: [{name: 'out'}] };
    const timeInput = { id: 'time', type: 'subgraph-input', x: 0, y: 200, outputs: [{name: 'out'}] };
    // subgraph output node
    const out = { id: 'out', type: 'subgraph-output', x: 500, y: 100, inputs: [{name: 'in'}] };

    subgraphNodes.push(const2Pi, mult1, mult2, sin, freqInput, timeInput, out);

    // Create connections
    // freq * time
    subgraphConnections.push({ fromNode: freqInput.id, fromOutput: 0, toNode: mult1.id, toInput: 0 });
    subgraphConnections.push({ fromNode: timeInput.id, fromOutput: 0, toNode: mult1.id, toInput: 1 });
    // (freq * time) * 2pi
    subgraphConnections.push({ fromNode: mult1.id, fromOutput: 0, toNode: mult2.id, toInput: 0 });
    subgraphConnections.push({ fromNode: const2Pi.id, fromOutput: 0, toNode: mult2.id, toInput: 1 });
    // sin((freq * time) * 2pi)
    subgraphConnections.push({ fromNode: mult2.id, fromOutput: 0, toNode: sin.id, toInput: 0 });
    // sin -> output
    subgraphConnections.push({ fromNode: sin.id, fromOutput: 0, toNode: out.id, toInput: 0 });

    return { nodes: subgraphNodes, connections: subgraphConnections };
}

function createNode(type, x, y) {
    const node = {
        id: Date.now(),
        type: type,
        x: x,
        y: y,
        width: 150,
        height: 80,
        inputs: [],
        outputs: [],
        value: 440, // Default frequency
    };

    switch (type) {
        case 'time':
            node.outputs.push({ name: 't' });
            break;
        case 'frequency':
            node.outputs.push({ name: 'freq' });
            break;
        case 'output':
            node.inputs.push({ name: 'in' });
            break;
        case 'constant':
            node.outputs.push({ name: 'out' });
            node.value = 1; // Default value
            break;
        case 'add':
            node.inputs.push({ name: 'in1' });
            node.inputs.push({ name: 'in2' });
            node.outputs.push({ name: 'out' });
            break;
        case 'multiply':
            node.inputs.push({ name: 'in1' });
            node.inputs.push({ name: 'in2' });
            node.outputs.push({ name: 'out' });
            break;
        case 'sin':
            node.inputs.push({ name: 'in' });
            node.outputs.push({ name: 'out' });
            break;
        case 'sine-wave':
            node.inputs.push({ name: 'freq' });
            node.inputs.push({ name: 'time' });
            node.outputs.push({ name: 'out' });
            node.isComposite = true;
            node.subgraph = createSineWaveSubgraph();
            break;
        case 'random':
            node.outputs.push({ name: 'out' });
            break;
    }
    nodes.push(node);
    draw();
}

function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(panX, panY);

    drawConnections();
    nodes.forEach(node => {
        drawNode(node);
    });
    if (connectingNode) {
        const worldCoords = screenToWorld(connectingNode.x, connectingNode.y);
        drawConnectionToCursor(worldCoords.x, worldCoords.y);
    }
    ctx.restore();
}

function drawNode(node) {
    ctx.fillStyle = '#f0f0f0';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(node.x, node.y, node.width, node.height);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.fillText(node.type, node.x + 10, node.y + 20);

    if (node.type === 'constant' || node.type === 'frequency') {
        ctx.fillText(node.value, node.x + 10, node.y + 60);
    }

    // Draw inputs
    node.inputs.forEach((input, i) => {
        input.x = node.x;
        input.y = node.y + 40 + i * 20;
        ctx.beginPath();
        ctx.arc(input.x, input.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText(input.name, input.x + 10, input.y + 5);
    });

    // Draw outputs
    node.outputs.forEach((output, i) => {
        output.x = node.x + node.width;
        output.y = node.y + 40 + i * 20;
        ctx.beginPath();
        ctx.arc(output.x, output.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText(output.name, output.x - 30, output.y + 5);
    });
}

function drawConnections() {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.fromNode);
        const toNode = nodes.find(n => n.id === conn.toNode);
        if (fromNode && toNode) {
            const fromConnector = fromNode.outputs[conn.fromOutput];
            const toConnector = toNode.inputs[conn.toInput];
            ctx.beginPath();
            ctx.moveTo(fromConnector.x, fromConnector.y);
            ctx.lineTo(toConnector.x, toConnector.y);
            ctx.stroke();
        }
    });
}

function drawConnectionToCursor(x, y) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(connectingNode.fromConnector.x, connectingNode.fromConnector.y);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function getNodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (x > node.x && x < node.x + node.width && y > node.y && y < node.y + node.height) {
            return node;
        }
    }
    return null;
}

function getConnectorAt(worldX, worldY) {
    for (const node of nodes) {
        for (let i = 0; i < node.inputs.length; i++) {
            const input = node.inputs[i];
            const dist = Math.sqrt(Math.pow(worldX - input.x, 2) + Math.pow(worldY - input.y, 2));
            if (dist < 15) {
                return { node, connector: input, type: 'input', index: i };
            }
        }
        for (let i = 0; i < node.outputs.length; i++) {
            const output = node.outputs[i];
            const dist = Math.sqrt(Math.pow(worldX - output.x, 2) + Math.pow(worldY - output.y, 2));
            if (dist < 15) {
                return { node, connector: output, type: 'output', index: i };
            }
        }
    }
    return null;
}

function screenToWorld(x, y) {
    return { x: x - panX, y: y - panY };
}

canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    handleMouseDown(worldCoords.x, worldCoords.y, x, y);
});

canvas.addEventListener('mousemove', (e) => {
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    handleMouseMove(worldCoords.x, worldCoords.y, x, y);
});

canvas.addEventListener('mouseup', (e) => {
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    handleMouseUp(worldCoords.x, worldCoords.y);
});

canvas.addEventListener('dblclick', (e) => {
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    showNodeValueInput(worldCoords.x, worldCoords.y);
});

let touchStartTime = 0;
let touchTimeout = null;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX - canvas.offsetLeft;
    const y = touch.clientY - canvas.offsetTop;

    touchTimeout = setTimeout(() => {
        const worldCoords = screenToWorld(x, y);
        showNodeValueInput(worldCoords.x, worldCoords.y);
        touchTimeout = null; // Prevent it from being cleared again
    }, 500);

    const worldCoords = screenToWorld(x, y);
    handleMouseDown(worldCoords.x, worldCoords.y, x, y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX - canvas.offsetLeft;
    const y = touch.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    handleMouseMove(worldCoords.x, worldCoords.y, x, y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const x = touch.clientX - canvas.offsetLeft;
    const y = touch.clientY - canvas.offsetTop;
    const worldCoords = screenToWorld(x, y);
    handleMouseUp(worldCoords.x, worldCoords.y);
});

function handleMouseDown(worldX, worldY, screenX, screenY) {
    // Clear any previous state
    draggingNode = null;
    isPotentialDrag = false;

    const connector = getConnectorAt(worldX, worldY);
    if (connector && connector.type === 'output') {
        connectingNode = {
            fromNode: connector.node,
            fromConnector: connector.connector,
            fromOutputIndex: connector.index,
            x: screenX,
            y: screenY
        };
        return;
    }

    potentialDragNode = getNodeAt(worldX, worldY);
    if (potentialDragNode) {
        isPotentialDrag = true;
        startX = screenX;
        startY = screenY;
    } else {
        isPanning = true;
        lastMouseX = screenX;
        lastMouseY = screenY;
    }
}

function handleMouseMove(worldX, worldY, screenX, screenY) {
    if (isPotentialDrag) {
        const dx = screenX - startX;
        const dy = screenY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            isPotentialDrag = false;
            draggingNode = potentialDragNode;
            potentialDragNode = null;
            dragOffsetX = worldX - draggingNode.x;
            dragOffsetY = worldY - draggingNode.y;

            if (touchTimeout) {
                clearTimeout(touchTimeout);
                touchTimeout = null;
            }
        }
    }

    if (draggingNode) {
        draggingNode.x = worldX - dragOffsetX;
        draggingNode.y = worldY - dragOffsetY;
        draw();
    } else if (connectingNode) {
        connectingNode.x = screenX;
        connectingNode.y = screenY;
        draw();
    } else if (isPanning) {
        const dx = screenX - lastMouseX;
        const dy = screenY - lastMouseY;
        panX += dx;
        panY += dy;
        lastMouseX = screenX;
        lastMouseY = screenY;
        draw();
    }
}

function handleMouseUp(worldX, worldY) {
    if (touchTimeout) {
        clearTimeout(touchTimeout);
        touchTimeout = null;
    }

    if (connectingNode) {
        const connector = getConnectorAt(worldX, worldY);
        if (connector && connector.type === 'input') {
            connections.push({
                fromNode: connectingNode.fromNode.id,
                fromOutput: connectingNode.fromOutputIndex,
                toNode: connector.node.id,
                toInput: connector.index,
            });
        }
        connectingNode = null;
        draw();
    }

    draggingNode = null;
    isPanning = false;
    isPotentialDrag = false;
    potentialDragNode = null;
}

let audioContext = null;
let audioSource = null;
let isPlaying = false;

const playButton = document.getElementById('play-button');
const playIcon = document.createElement('div');
playIcon.className = 'icon';
playButton.appendChild(playIcon);
playButton.classList.add('play');

playButton.addEventListener('click', () => {
    if (isPlaying) {
        if (audioSource) {
            audioSource.stop();
        }
        isPlaying = false;
        playButton.classList.remove('stop');
        playButton.classList.add('play');
        return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1; // 1 second buffer
    const bufferSize = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const channelData = buffer.getChannelData(0);

    const mainGraph = { nodes, connections };

    for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        const initialValues = { 'time': t }; // Special value for time
        const output = evaluateGraph(mainGraph, initialValues);
        channelData[i] = output;
    }

    applyLimiter(channelData);
    updateBufferInfo(channelData);

    audioSource = audioContext.createBufferSource();
    audioSource.buffer = buffer;
    audioSource.loop = true;
    audioSource.connect(audioContext.destination);
    audioSource.start();

    isPlaying = true;
    playButton.classList.remove('play');
    playButton.classList.add('stop');
});

const bufferInfoButton = document.getElementById('buffer-info-button');
const bufferInfoModal = document.getElementById('buffer-info-modal');
const closeModalButton = document.querySelector('.close-button');

bufferInfoButton.addEventListener('click', () => {
    bufferInfoModal.classList.remove('hidden');
});

closeModalButton.addEventListener('click', () => {
    bufferInfoModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target == bufferInfoModal) {
        bufferInfoModal.classList.add('hidden');
    }
});

function updateBufferInfo(buffer) {
    let min = buffer[0];
    let max = buffer[0];
    let sumOfSquares = 0;

    for (let i = 0; i < buffer.length; i++) {
        const sample = buffer[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
        sumOfSquares += sample * sample;
    }

    const rms = Math.sqrt(sumOfSquares / buffer.length);

    document.getElementById('sample-count').textContent = buffer.length;
    document.getElementById('max-amp').textContent = max.toFixed(4);
    document.getElementById('min-amp').textContent = min.toFixed(4);
    document.getElementById('rms-power').textContent = rms.toFixed(4);
}

function applyLimiter(buffer) {
    let max = 0;
    for (let i = 0; i < buffer.length; i++) {
        if (Math.abs(buffer[i]) > max) {
            max = Math.abs(buffer[i]);
        }
    }

    let gain = 0.5; // Reduce volume to 50%
    if (max > 1.0) {
        gain /= max; // Apply limiting and volume reduction in one step
    }

    for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= gain;
    }
}

function evaluateGraph(graph, initialInputs) {
    const sortedNodes = topSort(graph.nodes, graph.connections);
    const nodeValues = new Map();

    for (const node of sortedNodes) {
        let inputs = [];
        if (node.type === 'subgraph-input') {
            nodeValues.set(node.id, initialInputs[node.id]);
            continue;
        } else {
           inputs = getInputsForNode(node, graph.connections, nodeValues, graph.nodes);
        }

        if (node.isComposite) {
            const subgraphInputs = {};
            node.inputs.forEach((input, i) => {
                subgraphInputs[input.name] = inputs[i];
            });
            const result = evaluateGraph(node.subgraph, subgraphInputs);
            nodeValues.set(node.id, result);
        } else {
            switch (node.type) {
                case 'time':
                    nodeValues.set(node.id, initialInputs['time']);
                    break;
                case 'frequency':
                    nodeValues.set(node.id, node.value);
                    break;
                case 'constant':
                    nodeValues.set(node.id, node.value);
                    break;
                case 'add':
                    nodeValues.set(node.id, (inputs[0] || 0) + (inputs[1] || 0));
                    break;
                case 'multiply':
                    nodeValues.set(node.id, (inputs[0] || 0) * (inputs[1] || 0));
                    break;
                case 'sin':
                    nodeValues.set(node.id, Math.sin(inputs[0] || 0));
                    break;
                case 'random':
                    nodeValues.set(node.id, Math.random());
                    break;
                case 'subgraph-output':
                    return inputs[0] || 0;
                case 'output':
                    // This is for the main graph's output
                    nodeValues.set(node.id, inputs[0] || 0);
                    break;
            }
        }
    }
    const outputNode = graph.nodes.find(n => n.type === 'output');
    return outputNode ? nodeValues.get(outputNode.id) : 0;
}

function getInputsForNode(node, connections, nodeValues, allNodes) {
    const inputs = [];
    const inputConnections = connections.filter(c => c.toNode === node.id);
    for (let i = 0; i < node.inputs.length; i++) {
        const conn = inputConnections.find(c => c.toInput === i);
        if (conn) {
            const fromNode = allNodes.find(n => n.id === conn.fromNode);
            const outputIndex = conn.fromOutput; // We'll assume one output for now
            if(fromNode) inputs.push(nodeValues.get(fromNode.id));
        } else {
            inputs.push(0);
        }
    }
    return inputs;
}

function topSort(nodes, connections) {
    const sorted = [];
    const inDegree = new Map();
    const adj = new Map();

    nodes.forEach(node => {
        inDegree.set(node.id, 0);
        adj.set(node.id, []);
    });

    connections.forEach(conn => {
        adj.get(conn.fromNode).push(conn.toNode);
        inDegree.set(conn.toNode, inDegree.get(conn.toNode) + 1);
    });

    const queue = [];
    nodes.forEach(node => {
        if (inDegree.get(node.id) === 0) {
            queue.push(node);
        }
    });

    while (queue.length > 0) {
        const u = queue.shift();
        sorted.push(u);
        adj.get(u.id).forEach(vId => {
            const v = nodes.find(n => n.id === vId);
            inDegree.set(v.id, inDegree.get(v.id) - 1);
            if (inDegree.get(v.id) === 0) {
                queue.push(v);
            }
        });
    }

    return sorted;
}

function showNodeValueInput(worldX, worldY) {
    const node = getNodeAt(worldX, worldY);
    if (!node || (node.type !== 'constant' && node.type !== 'frequency')) {
        return;
    }

    const input = document.createElement('input');
    input.type = 'number';
    input.value = node.value;
    input.style.position = 'absolute';
    input.style.left = (node.x + panX + 10) + 'px';
    input.style.top = (node.y + panY + 40) + 'px';
    input.style.width = (node.width - 20) + 'px';

    const finishEditing = () => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            node.value = value;
        }
        document.body.removeChild(input);
        draw();
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditing();
        }
    });

    document.body.appendChild(input);
    input.focus();
    input.select();
}

resizeCanvas();
