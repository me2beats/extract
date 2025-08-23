// All helper functions are copied here to be self-contained in the worklet scope.

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

function getInputsForNode(node, connections, nodeValues, allNodes) {
    const inputs = [];
    const inputConnections = connections.filter(c => c.toNode === node.id);
    for (let i = 0; i < node.inputs.length; i++) {
        const conn = inputConnections.find(c => c.toInput === i);
        if (conn) {
            const fromNode = allNodes.find(n => n.id === conn.fromNode);
            if(fromNode) inputs.push(nodeValues.get(fromNode.id));
        } else {
            inputs.push(0);
        }
    }
    return inputs;
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
                    nodeValues.set(node.id, (inputs[0] || 0) % (inputs[1] || 1));
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
                    nodeValues.set(node.id, inputs[0] || 0);
                    break;
            }
        }
    }
    const outputNode = graph.nodes.find(n => n.type === 'output');
    return outputNode ? nodeValues.get(outputNode.id) : 0;
}


class MyAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.graph = null;
        this.sortedNodes = null;
        this.currentTime = 0;

        this.port.onmessage = (event) => {
            if (event.data.type === 'update-graph') {
                this.graph = event.data.graph;
                this.sortedNodes = topSort(this.graph.nodes, this.graph.connections);
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];

        if (!this.graph || !this.sortedNodes) {
            return true; // Not ready yet
        }

        for (let i = 0; i < channel.length; i++) {
            const initialValues = { 'time': this.currentTime };
            const value = evaluateSortedGraph(this.graph, initialValues, this.sortedNodes);
            channel[i] = value;
            this.currentTime += 1 / sampleRate;
        }

        return true;
    }
}

registerProcessor('my-audio-processor', MyAudioProcessor);
