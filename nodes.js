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
    if (type.startsWith('composition_')) {
        const compName = type.substring('composition_'.length);
        const savedCompositions = JSON.parse(localStorage.getItem('compositions') || '[]');
        const compTemplate = savedCompositions.find(c => c.name === compName);

        if (compTemplate) {
            // Create a deep copy with new unique IDs
            const idMap = new Map();
            const getNewId = (oldId) => {
                if (!idMap.has(oldId)) {
                    idMap.set(oldId, Date.now() + Math.random());
                }
                return idMap.get(oldId);
            };

            const newSubgraphNodes = compTemplate.nodes.map(n => ({
                ...n,
                id: getNewId(n.id)
            }));
            const newSubgraphConnections = compTemplate.connections.map(c => ({
                ...c,
                fromNode: getNewId(c.fromNode),
                toNode: getNewId(c.toNode)
            }));

            const node = {
                id: Date.now(),
                type: type,
                x: x,
                y: y,
                width: 200,
                height: 40 + Math.max(compTemplate.inputs.length, compTemplate.outputs.length) * 20 + 20,
                inputs: compTemplate.inputs,
                outputs: compTemplate.outputs,
                isComposite: true,
                subgraph: {
                    nodes: newSubgraphNodes,
                    connections: newSubgraphConnections
                }
            };
            nodes.push(node);
            updateWorkletGraph();
            draw();
            return;
        }
    }

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
        case 'pi':
            node.outputs.push({ name: 'out' });
            node.value = Math.PI;
            break;
        case 'mod':
            node.inputs.push({ name: 'a' });
            node.inputs.push({ name: 'b' });
            node.outputs.push({ name: 'out' });
            break;
        case 'sign':
            node.inputs.push({ name: 'in' });
            node.outputs.push({ name: 'out' });
            break;
        case 'arcsin':
            node.inputs.push({ name: 'in' });
            node.outputs.push({ name: 'out' });
            break;
        case 'min':
            node.inputs.push({ name: 'a' });
            node.inputs.push({ name: 'b' });
            node.outputs.push({ name: 'out' });
            break;
        case 'max':
            node.inputs.push({ name: 'a' });
            node.inputs.push({ name: 'b' });
            node.outputs.push({ name: 'out' });
            break;
    }
    nodes.push(node);
    updateWorkletGraph();
    draw();
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

function deleteNode(nodeId) {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    // Remove the node
    nodes.splice(nodeIndex, 1);

    // Remove all connections to and from the node
    for (let i = connections.length - 1; i >= 0; i--) {
        if (connections[i].fromNode === nodeId || connections[i].toNode === nodeId) {
            connections.splice(i, 1);
        }
    }

    updateWorkletGraph();
    draw();
}
