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
    const sortedNodes = topSort(mainGraph.nodes, mainGraph.connections);

    const startTime = performance.now();
    for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        const initialValues = { 'time': t }; // Special value for time
        const output = evaluateSortedGraph(mainGraph, initialValues, sortedNodes);
        channelData[i] = output;
    }
    const endTime = performance.now();
    const generationTime = endTime - startTime;

    applyLimiter(channelData);
    updateBufferInfo(channelData, generationTime);

    audioSource = audioContext.createBufferSource();
    audioSource.buffer = buffer;
    audioSource.loop = true;
    audioSource.connect(audioContext.destination);
    audioSource.start();

    isPlaying = true;
    playButton.classList.remove('play');
    playButton.classList.add('stop');
});

function updateBufferInfo(buffer, generationTime) {
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
    if (generationTime !== undefined) {
        document.getElementById('generation-time').textContent = generationTime.toFixed(2);
    }
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
    return evaluateSortedGraph(graph, initialInputs, sortedNodes);
}

function evaluateSortedGraph(graph, initialInputs, sortedNodes) {
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
                    nodeValues.set(node.id, (Math.random() * 2) - 1);
                    break;
                case 'pi':
                    nodeValues.set(node.id, Math.PI);
                    break;
                case 'mod':
                    nodeValues.set(node.id, (inputs[0] || 0) % (inputs[1] || 1)); // Mod by 1 to avoid division by zero
                    break;
                case 'sign':
                    nodeValues.set(node.id, Math.sign(inputs[0] || 0));
                    break;
                case 'arcsin':
                    nodeValues.set(node.id, Math.asin(inputs[0] || 0));
                    break;
                case 'min':
                    nodeValues.set(node.id, Math.min(inputs[0] || 0, inputs[1] || 0));
                    break;
                case 'max':
                    nodeValues.set(node.id, Math.max(inputs[0] || 0, inputs[1] || 0));
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
