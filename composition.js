const menuBufferInfo = document.getElementById('menu-buffer-info');
const bufferInfoModal = document.getElementById('buffer-info-modal');
const closeModalButton = document.querySelector('.close-button');

menuBufferInfo.addEventListener('click', (e) => {
    e.preventDefault();
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

const menuSaveComposition = document.getElementById('menu-save-composition');
menuSaveComposition.addEventListener('click', (e) => {
    e.preventDefault();
    saveSelectedComposition();
});

function saveSelectedComposition() {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) {
        alert("No nodes selected.");
        return;
    }

    const name = prompt("Enter a name for the composition:");
    if (!name) return;

    const composition = serializeComposition(selectedNodes, name);

    // Save to localStorage
    const savedCompositions = JSON.parse(localStorage.getItem('compositions') || '[]');
    savedCompositions.push(composition);
    localStorage.setItem('compositions', JSON.stringify(savedCompositions));

    addCompositionToSidebar(composition);
}

function serializeComposition(selectedNodes, name) {
    const nodeCopies = JSON.parse(JSON.stringify(selectedNodes));
    const nodeIds = new Set(nodeCopies.map(n => n.id));

    // Find internal connections
    const internalConnections = connections.filter(c => nodeIds.has(c.fromNode) && nodeIds.has(c.toNode));

    // Normalize positions
    let minX = Infinity;
    let minY = Infinity;
    nodeCopies.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
    });
    nodeCopies.forEach(n => {
        n.x -= minX;
        n.y -= minY;
    });

    const inputs = [];
    const outputs = [];
    const internalConnectionTargets = new Set(internalConnections.map(c => `${c.toNode}:${c.toInput}`));
    const internalConnectionSources = new Set(internalConnections.map(c => `${c.fromNode}:${c.fromOutput}`));

    nodeCopies.forEach(n => {
        n.inputs.forEach((input, i) => {
            if (!internalConnectionTargets.has(`${n.id}:${i}`)) {
                inputs.push({ name: `${n.type}_in_${i}`, mapsTo: { nodeId: n.id, inputIndex: i } });
            }
        });
        n.outputs.forEach((output, i) => {
            if (!internalConnectionSources.has(`${n.id}:${i}`)) {
                outputs.push({ name: `${n.type}_out_${i}`, mapsTo: { nodeId: n.id, outputIndex: i } });
            }
        });
    });

    return {
        name: name,
        nodes: nodeCopies,
        connections: internalConnections,
        inputs: inputs,
        outputs: outputs
    };
}

function addCompositionToSidebar(composition) {
    const sidebar = document.getElementById('sidebar');
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.setAttribute('draggable', 'true');
    nodeDiv.dataset.type = `composition_${composition.name}`;
    nodeDiv.textContent = composition.name;

    // Add drag listener
    nodeDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.type);
    });

    // Add touch listener
    nodeDiv.addEventListener('touchstart', (e) => {
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
                const worldCoords = screenToWorld(x, y);
                createNode(type, worldCoords.x, worldCoords.y);
            }
        };

        document.addEventListener('touchmove', touchMove);
        document.addEventListener('touchend', touchEnd);
    });

    sidebar.appendChild(nodeDiv);
}

function loadCompositionsFromStorage() {
    const savedCompositions = JSON.parse(localStorage.getItem('compositions') || '[]');
    savedCompositions.forEach(comp => addCompositionToSidebar(comp));
}
