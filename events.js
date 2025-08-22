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
                const worldCoords = screenToWorld(x, y);
                createNode(type, worldCoords.x, worldCoords.y);
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
    const worldCoords = screenToWorld(x, y);
    createNode(type, worldCoords.x, worldCoords.y);
});

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
    // Check if a delete button was clicked
    for (const node of nodes) {
        if (node.deleteButton && worldX > node.deleteButton.x && worldX < node.deleteButton.x + node.deleteButton.width &&
            worldY > node.deleteButton.y && worldY < node.deleteButton.y + node.deleteButton.height) {

            if (node.id === 'output') {
                alert("The Output node cannot be deleted.");
                return;
            }

            if (window.confirm(`Are you sure you want to delete the ${node.type} node?`)) {
                deleteNode(node.id);
            }
            return; // Stop further processing
        }
    }

    if (isSelectMode) {
        const node = getNodeAt(worldX, worldY);
        if (node) {
            node.selected = !node.selected;
            draw();
        }
        return;
    }

    // Clear any previous state
    draggingNode = null;
    isPotentialDrag = false;

    const connector = getConnectorAt(worldX, worldY);
    if (connector) {
        if (connector.type === 'output') {
            connectingNode = {
                fromNode: connector.node,
                fromConnector: connector.connector,
                fromOutputIndex: connector.index,
                x: screenX,
                y: screenY
            };
        } else { // It's an input connector
            const existingConnectionIndex = connections.findIndex(c => c.toNode === connector.node.id && c.toInput === connector.index);
            if (existingConnectionIndex !== -1) {
                const conn = connections[existingConnectionIndex];
                const sourceNode = nodes.find(n => n.id === conn.fromNode);
                const sourceConnector = sourceNode.outputs[conn.fromOutput];

                // Remove the old connection
                connections.splice(existingConnectionIndex, 1);

                // Start a new connection from the original source
                connectingNode = {
                    fromNode: sourceNode,
                    fromConnector: sourceConnector,
                    fromOutputIndex: conn.fromOutput,
                    x: screenX,
                    y: screenY
                };
                draw();
            }
        }
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

window.addEventListener('resize', resizeCanvas);
