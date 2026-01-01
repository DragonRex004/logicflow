const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let draggingNode = null;
let offsetX = 0;
let offsetY = 0;

let selectedOutput = null;
let mouseX = 0;
let mouseY = 0;

let hoveredPort = null;

const GRID_SIZE = 20;
const GRID_COLOR = "#1f2937";

let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

let isPanning = false;
let panStart = { x: 0, y: 0 };

let selectedNode = null;
let clipboard = null;

function isPointInRect(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
}

function screenToWorld(x, y) {
    return {
        x: (x - camera.x) / camera.zoom,
        y: (y - camera.y) / camera.zoom
    };
}

function worldToScreen(x, y) {
    return {
        x: x * camera.zoom + camera.x,
        y: y * camera.zoom + camera.y
    };
}

function snap(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function drawGrid() {
    const step = GRID_SIZE;

    const startX = -camera.x / camera.zoom;
    const startY = -camera.y / camera.zoom;

    const endX = startX + canvas.width / camera.zoom;
    const endY = startY + canvas.height / camera.zoom;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1 / camera.zoom;

    for (let x = Math.floor(startX / step) * step; x < endX; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }

    for (let y = Math.floor(startY / step) * step; y < endY; y += step) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

window.addEventListener("keydown", e => {
    if (e.code === "Space") isPanning = true;
    if (e.key === "Delete" && selectedNode) {
        const id = selectedNode.id;

        nodes = nodes.filter(n => n.id !== id);

        connections = connections.filter(c =>
            c.from.nodeId !== id && c.to.nodeId !== id
        );

        selectedNode = null;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "c" && selectedNode) {
        clipboard = JSON.parse(JSON.stringify(selectedNode));
    }
    if (e.ctrlKey && e.key.toLowerCase() === "v" && clipboard) {

        const newNode = JSON.parse(JSON.stringify(clipboard));
        newNode.id = crypto.randomUUID();
        newNode.x += 20;
        newNode.y += 20;

        nodes.push(newNode);
        selectedNode = newNode;
    }
});

window.addEventListener("keyup", e => {
    if (e.code === "Space") isPanning = false;
});

canvas.addEventListener("mousedown", e => {
    if (!isPanning) return;

    panStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", e => {
    if (!isPanning) return;

    const { x: mx, y: my } = getMousePos(e);

    camera.x += mx - panStart.x;
    camera.y += my - panStart.y;

    panStart = { x: mx, y: my };
});


canvas.addEventListener("wheel", e => {
    e.preventDefault();

    const zoomFactor = 1.1;
    const mouse = getMousePos(e);
    const worldBefore = screenToWorld(mouse.x, mouse.y);

    if (e.deltaY < 0) {
        camera.zoom *= zoomFactor;
    } else {
        camera.zoom /= zoomFactor;
    }

    camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));

    const worldAfter = screenToWorld(mouse.x, mouse.y);

    camera.x += (worldAfter.x - worldBefore.x) * camera.zoom;
    camera.y += (worldAfter.y - worldBefore.y) * camera.zoom;
});


canvas.addEventListener("mousedown", e => {
    const pos = getMousePos(e);
    const world = screenToWorld(pos.x, pos.y);
    mouseX = pos.x;
    mouseY = pos.y;

    for (const node of nodes) {
        if (
            world.x >= node.x && world.x <= node.x + node.width &&
            world.y >= node.y && world.y <= node.y + node.height
        ) {
            draggingNode = node;
            offsetX = world.x - node.x;
            offsetY = world.y - node.y;
            break;
        }

        for (let i = 0; i < node.outputs.length; i++) {
            const px = node.x + node.width + 5;
            const py = node.y + 35 + i * 15;

            if (isPointInCircle(world.x, world.y, px, py, 6)) {
                selectedOutput = {
                    nodeId: node.id,
                    portIndex: i
                };
                return;
            }
        }

        for (let i = 0; i < node.inputs.length; i++) {
            const px = node.x - 5;
            const py = node.y + 35 + i * 15;

            if (isPointInCircle(world.x, world.y, px, py, 6) && selectedOutput) {
                connections.push({
                    from: selectedOutput,
                    to: {
                        nodeId: node.id,
                        portIndex: i
                    }
                });
                selectedOutput = null;
                return;
            }
        }

        if (e.button === 0) {
            const { x, y } = getMousePos(e);
            const world = screenToWorld(x, y);

            selectedNode = null;

            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                if (isPointInRect(world.x, world.y, n.x, n.y, n.width, n.height)) {
                    selectedNode = n;
                    break;
                }
            }
        }
    }
    selectedOutput = null;

    if (e.button === 2) {
        connections = connections.filter(c => {
            const fromNode = nodes.find(n => n.id === c.from.nodeId);
            const toNode = nodes.find(n => n.id === c.to.nodeId);
            if (!fromNode || !toNode) return true;

            const x1 = fromNode.x + fromNode.width + 5;
            const y1 = fromNode.y + 35 + c.from.portIndex * 15;
            const x2 = toNode.x - 5;
            const y2 = toNode.y + 35 + c.to.portIndex * 15;

            const dist = distancePointToLine(mouseX, mouseY, x1, y1, x2, y2);

            return dist > 6;
        });
    }
});

canvas.addEventListener("mousemove", e => {
    const mouse = getMousePos(e);
    const world = screenToWorld(mouse.x, mouse.y);
    if (draggingNode) {
        draggingNode.x = world.x - offsetX;
        draggingNode.y = world.y - offsetY;
    }
    mouseX = getMousePos(e).x;
    mouseY = getMousePos(e).y;

    hoveredPort = getPortAtPosition(world.x, world.y);
});

canvas.addEventListener("mouseup", () => {
    draggingNode.x = snap(draggingNode.x);
    draggingNode.y = snap(draggingNode.y);
    draggingNode = null;
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

canvas.addEventListener("contextmenu", e => {
    e.preventDefault();
});

function drawNodes() {
    nodes.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;

        // Body
        ctx.fillStyle = "#1f2937";
        ctx.strokeStyle = isSelected ? "#fbbf24" : "#3b82f6";
        ctx.lineWidth = isSelected ? 3 : 2;

        ctx.fillRect(node.x, node.y, node.width, node.height);
        ctx.strokeRect(node.x, node.y, node.width, node.height);

        // Title
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        ctx.fillText(node.name, node.x + 8, node.y + 18);

        drawPorts(node);
    });
}


function distancePointToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = dot / lenSq;

    t = Math.max(0, Math.min(1, t));

    const lx = x1 + t * C;
    const ly = y1 + t * D;

    return Math.hypot(px - lx, py - ly);
}


function drawPorts(node) {
    const portRadius = 5;

    node.inputs.forEach((p, i) => {
        const x = node.x - 5;
        const y = node.y + 35 + i * 15;

        const isHover =
            hoveredPort &&
            hoveredPort.nodeId === node.id &&
            hoveredPort.portIndex === i &&
            hoveredPort.type === "input";

        ctx.fillStyle = isHover ? "#2563eb" : "#60a5fa";
        ctx.beginPath();
        ctx.arc(x, y, portRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    node.outputs.forEach((p, i) => {
        const x = node.x + node.width + 5;
        const y = node.y + 35 + i * 15;

        const isSelected =
            selectedOutput &&
            selectedOutput.nodeId === node.id &&
            selectedOutput.portIndex === i;

        const isHover =
            hoveredPort &&
            hoveredPort.nodeId === node.id &&
            hoveredPort.portIndex === i &&
            hoveredPort.type === "output";

        ctx.fillStyle = isSelected
            ? "#fbbf24"
            : isHover
                ? "#059669"
                : "#34d399";

        ctx.beginPath();
        ctx.arc(x, y, portRadius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function isPointInCircle(px, py, cx, cy, r) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
}

function drawConnections() {
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;

    connections.forEach(c => {
        const fromNode = nodes.find(n => n.id === c.from.nodeId);
        const toNode = nodes.find(n => n.id === c.to.nodeId);
        if (!fromNode || !toNode) return;

        const x1 = fromNode.x + fromNode.width + 5;
        const y1 = fromNode.y + 35 + c.from.portIndex * 15;

        const x2 = toNode.x - 5;
        const y2 = toNode.y + 35 + c.to.portIndex * 15;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    // ✏️ Preview
    if (selectedOutput) {
        const node = nodes.find(n => n.id === selectedOutput.nodeId);
        if (!node) return;

        const x1 = node.x + node.width + 5;
        const y1 = node.y + 35 + selectedOutput.portIndex * 15;

        ctx.strokeStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
    }
}

function getPortAtPosition(mx, my) {
    for (const node of nodes) {

        // Outputs
        for (let i = 0; i < node.outputs.length; i++) {
            const px = node.x + node.width + 5;
            const py = node.y + 35 + i * 15;
            if (isPointInCircle(mx, my, px, py, 6)) {
                return { nodeId: node.id, portIndex: i, type: "output" };
            }
        }

        // Inputs
        for (let i = 0; i < node.inputs.length; i++) {
            const px = node.x - 5;
            const py = node.y + 35 + i * 15;
            if (isPointInCircle(mx, my, px, py, 6)) {
                return { nodeId: node.id, portIndex: i, type: "input" };
            }
        }
    }
    return null;
}



function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    drawGrid();
    drawConnections();
    drawNodes();

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
