const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_DIR = path.join(__dirname, "entries");

app.use(express.json());
app.use(express.static(__dirname));

// Session middleware
app.use(session({
    secret: 'your-secret-key', // A random secret key
    resave: false,
    saveUninitialized: true,
}));

// Ensure `entries/` exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Save note as an HTML file, but associate the note with a session (user-specific)
app.post("/save", (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content required");

    // Ensure each user has their own notes folder
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    if (!fs.existsSync(userNotesDir)) {
        fs.mkdirSync(userNotesDir);
    }

    const filePath = path.join(userNotesDir, `${title.replace(/\s+/g, "_")}.html`);
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; padding: 20px; max-width: 600px; margin: 50px auto; background: white; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); }
            h1 { color: #007bff; text-align: center; }
            p { font-size: 18px; line-height: 1.6; }
            .container { padding: 20px; }
            .back-btn { display: block; text-align: center; margin-top: 20px; padding: 10px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            .back-btn:hover { background: #0056b3; }
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
    res.send({ message: "Note saved!", path: `/entries/${req.sessionID}/${title.replace(/\s+/g, "_")}.html` });
});

// List saved notes for the current user (session-based)
app.get("/notes", (req, res) => {
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);

    if (!fs.existsSync(userNotesDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(userNotesDir).filter(file => file.endsWith(".html"));
    res.json(files.map(file => ({
        title: file.replace(".html", ""),
        path: `/entries/${req.sessionID}/${file}`
    })));
});

// Delete note (only for the current user)
app.delete("/delete/:title", (req, res) => {
    const title = req.params.title.replace(/\s+/g, "_");
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    const filePath = path.join(userNotesDir, `${title}.html`);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.send({ message: "Note deleted!" });
    } else {
        res.status(404).send({ message: "Note not found!" });
    }
});

// Serve notes for each user
app.use("/entries", (req, res, next) => {
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    express.static(userNotesDir)(req, res, next);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
