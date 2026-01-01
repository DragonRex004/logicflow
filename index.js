const express = require("express");
const nodeRoutes = require("./routes/nodes");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/nodes", nodeRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
