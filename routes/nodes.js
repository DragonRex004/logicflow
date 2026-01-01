const express = require("express");
const router = express.Router();

const NODE_TYPES = {
    AND: {
        inputs: ["a", "b"],
        outputs: ["out"]
    },
    OR: {
        inputs: ["a", "b"],
        outputs: ["out"]
    },
    NOT: {
        inputs: ["in"],
        outputs: ["out"]
    }
};

let nodes = [];
let connections = [];

router.post("/connect", (req, res) => {
    const { from, to } = req.body;

    if (!from || !to) {
        return res.status(400).json({ error: "Invalid connection data" });
    }

    const connection = {
        id: crypto.randomUUID(),
        from,
        to
    };

    connections.push(connection);
    res.status(201).json(connection);
});

router.get("/connections", (req, res) => {
    res.json(connections);
});

router.get("/", (req, res) => {
    res.json(nodes);
});

router.post("/", (req, res) => {
    const { name, type } = req.body;

    if (!NODE_TYPES[type]) {
        return res.status(400).json({ error: "Unknown node type" });
    }

    const template = NODE_TYPES[type];

    const node = {
        id: crypto.randomUUID(),
        name: name || `${type} Node`,
        type,
        inputs: template.inputs.map(id => ({
            id,
            value: false
        })),
        outputs: template.outputs.map(id => ({
            id,
            value: false
        }))
    };

    nodes.push(node);
    res.status(201).json(node);
});


module.exports = router;
