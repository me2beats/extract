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

let audioContext = null;
let audioSource = null;
let isPlaying = false;
let isSelectMode = false;

const selectModeButton = document.getElementById('select-mode-button');
selectModeButton.addEventListener('click', () => {
    isSelectMode = !isSelectMode;
    selectModeButton.classList.toggle('active', isSelectMode);

    // Unselect all nodes when exiting select mode
    if (!isSelectMode) {
        nodes.forEach(n => n.selected = false);
        draw();
    }
});

// Initial setup
loadCompositionsFromStorage();
resizeCanvas();
