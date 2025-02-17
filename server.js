const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_DIR = path.join(__dirname, "entries"); // ✅ Works on all OS

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Ensure `entries/` exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Delete a note
app.delete("/delete/:title", (req, res) => {
    const title = req.params.title.replace(/\s+/g, "_");
    const filePath = path.join(NOTES_DIR, `${title}.html`);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.send({ message: "Note deleted!" });
    } else {
        res.status(404).send({ message: "Note not found!" });
    }
});

// Save note as an HTML file
app.post("/save", (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content required");

    const filePath = path.join(NOTES_DIR, `${title.replace(/\s+/g, "_")}.html`);
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f5f5f5;
                color: #333;
                padding: 20px;
                max-width: 600px;
                margin: 50px auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #007bff;
                text-align: center;
            }
            p {
                font-size: 18px;
                line-height: 1.6;
            }
            .container {
                padding: 20px;
            }
            .back-btn {
                display: block;
                text-align: center;
                margin-top: 20px;
                padding: 10px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
            }
            .back-btn:hover {
                background: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${title}</h1>
            <p>${content.replace(/\n/g, "<br>")}</p>
            <a class="back-btn" href="/">← Back to Notes</a>
        </div>
    </body>
    </html>`;

    fs.writeFileSync(filePath, htmlTemplate);
    res.send({ message: "Note saved!", path: `/entries/${title.replace(/\s+/g, "_")}.html` });
});

// List saved notes
app.get("/notes", (req, res) => {
    const files = fs.readdirSync(NOTES_DIR).filter(file => file.endsWith(".html"));
    res.json(files.map(file => ({ title: file.replace(".html", ""), path: `/entries/${file}` })));
});

// Serve notes
app.use("/entries", express.static(NOTES_DIR));

// Start the server
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
