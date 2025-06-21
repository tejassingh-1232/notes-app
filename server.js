const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_DIR = path.join(__dirname, "entries");

app.use(express.json());
app.use(express.static(__dirname));

// Middleware to add headers for extra security (optional)
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
});

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Change to a strong secret in production!
    resave: false,
    saveUninitialized: true,
}));

// Ensure `entries/` exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (char) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])
    );
}

// Sanitize filename to remove risky characters
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9 _-]/g, "_").replace(/\s+/g, "_");
}

// Save note as an HTML file
app.post("/save", (req, res) => {
    let { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content required");

    // Reject unsafe titles
    if (!/^[a-zA-Z0-9 _-]+$/.test(title)) {
        return res.status(400).send("Invalid title format. Use only letters, numbers, spaces, dashes or underscores.");
    }

    const safeFilename = sanitizeFilename(title);
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    if (!fs.existsSync(userNotesDir)) {
        fs.mkdirSync(userNotesDir);
    }

    const filePath = path.join(userNotesDir, `${safeFilename}.html`);
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHTML(title)}</title>
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
            <h1>${escapeHTML(title)}</h1>
            <p>${escapeHTML(content).replace(/\n/g, "<br>")}</p>
            <a class="back-btn" href="/">← Back to Notes</a>
        </div>
    </body>
    </html>`;

    fs.writeFileSync(filePath, htmlTemplate);
    res.send({ message: "Note saved!", path: `/entries/${req.sessionID}/${safeFilename}.html` });
});

// List notes for the current user
app.get("/notes", (req, res) => {
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    if (!fs.existsSync(userNotesDir)) return res.json([]);

    const files = fs.readdirSync(userNotesDir).filter(file => file.endsWith(".html"));
    res.json(files.map(file => ({
        title: file.replace(".html", "").replace(/_/g, " "),
        path: `/entries/${req.sessionID}/${file}`
    })));
});

// Delete a note
app.delete("/delete/:title", (req, res) => {
    const safeTitle = sanitizeFilename(req.params.title);
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    const filePath = path.join(userNotesDir, `${safeTitle}.html`);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.send({ message: "Note deleted!" });
    } else {
        res.status(404).send({ message: "Note not found!" });
    }
});

// Serve entries per user
app.use("/entries", (req, res, next) => {
    const userNotesDir = path.join(NOTES_DIR, req.sessionID);
    express.static(userNotesDir)(req, res, next);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));