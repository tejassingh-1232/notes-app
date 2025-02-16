const express = require("express");
const fs = require("fs");
const path = require("path");

const NOTES_DIR = "C:/entries";
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend

// Ensure C:/entries exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Save note as .html
app.post("/save", (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content required");

    const filePath = path.join(NOTES_DIR, `${title}.html`);
    fs.writeFileSync(filePath, `<html><body>${content}</body></html>`);
    res.send("Note saved!");
});

// List saved notes
app.get("/notes", (req, res) => {
    const files = fs.readdirSync(NOTES_DIR).filter(file => file.endsWith(".html"));
    res.json(files.map(file => ({ title: file.replace(".html", ""), path: `/entries/${file}` })));
});

// Serve notes from C:/entries via Express
app.use("/entries", express.static(NOTES_DIR));

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
