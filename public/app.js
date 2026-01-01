let nodes = [];
let connections = [];

const NODE_TEMPLATES = {
    AND: {
        name: "AND",
        inputs: ["a", "b"],
        outputs: ["out"]
    },
    OR: {
        name: "OR",
        inputs: ["a", "b"],
        outputs: ["out"]
    },
    NOT: {
        name: "NOT",
        inputs: ["in"],
        outputs: ["out"]
    }
};

function createNode(type, x = 200, y = 100) {
    const tpl = NODE_TEMPLATES[type];
    if (!tpl) return;

    const node = {
        id: crypto.randomUUID(),
        name: `${tpl.name} Node`,
        type,
        x,
        y,
        width: 140,
        height: 40 + tpl.inputs.length * 15,
        inputs: tpl.inputs.map(id => ({ id })),
        outputs: tpl.outputs.map(id => ({ id }))
    };

    nodes.push(node);
}

document.querySelectorAll(".palette-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const type = btn.dataset.type;

        createNode(
            type,
            250 + Math.random() * 100,
            100 + Math.random() * 100
        );
    });
});

document.getElementById("saveBtn").addEventListener("click", saveGraph);

function saveGraph() {
    const data = {
        version: 1,
        camera,
        nodes,
        connections
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();

    URL.revokeObjectURL(url);
}

document.getElementById("loadBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
});

function loadGraph(data) {
    if (!data || data.version !== 1) {
        alert("Ungültige oder unbekannte Datei");
        return;
    }

    nodes.length = 0;
    connections.length = 0;

    data.nodes.forEach(n => nodes.push(n));
    data.connections.forEach(c => connections.push(c));

    if (data.camera) {
        camera.x = data.camera.x;
        camera.y = data.camera.y;
        camera.zoom = data.camera.zoom;
    }
}

document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        loadGraph(JSON.parse(reader.result));
    };
    reader.readAsText(file);
});
