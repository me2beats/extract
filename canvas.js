function resizeCanvas() {
    canvas.width = window.innerWidth - 140;
    canvas.height = window.innerHeight;
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
    ctx.strokeStyle = node.selected ? 'blue' : '#000';
    ctx.lineWidth = node.selected ? 2 : 1;
    ctx.beginPath();
    ctx.rect(node.x, node.y, node.width, node.height);
    ctx.fill();
    ctx.stroke();

    // Draw delete button
    const deleteButtonSize = 15;
    node.deleteButton = {
        x: node.x + node.width - deleteButtonSize - 5,
        y: node.y + 5,
        width: deleteButtonSize,
        height: deleteButtonSize
    };
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(node.deleteButton.x, node.deleteButton.y);
    ctx.lineTo(node.deleteButton.x + deleteButtonSize, node.deleteButton.y + deleteButtonSize);
    ctx.moveTo(node.deleteButton.x + deleteButtonSize, node.deleteButton.y);
    ctx.lineTo(node.deleteButton.x, node.deleteButton.y + deleteButtonSize);
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

function screenToWorld(x, y) {
    return { x: x - panX, y: y - panY };
}
