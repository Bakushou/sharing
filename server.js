require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fetch = require("node-fetch"); // Ensure fetch is available for node.js

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer();

// 📝 Speech-to-Text Route
app.post("/speech-to-text", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

    const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const base64Audio = req.file.buffer.toString("base64");

    try {
        const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "en-US" },
                    audio: { content: base64Audio },
                }),
            }
        );

        const data = await response.json();
        const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || "";

        if (!transcript) {
            return res.status(400).json({ error: "Could not recognize speech" });
        }

        res.json({ transcript });
    } catch (error) {
        console.error("Error processing speech-to-text:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 🔍 AI Fact-Check Route
app.post("/checkMistake", async (req, res) => {
    const { transcript } = req.body;
    const openAiKey = process.env.OPENAI_API_KEY;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are an AI that corrects misinformation." },
                    { role: "user", content: transcript },
                ],
                temperature: 0.5,
            }),
        });

        const data = await response.json();
        const correction = data.choices?.[0]?.message?.content || "";

        res.json({ correction });
    } catch (error) {
        console.error("Error in OpenAI API call:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
