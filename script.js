const startButton = document.getElementById("startListening");
const outputDiv = document.getElementById("output");

let mediaRecorder;
let audioChunks = [];

// 🎤 Start Recording
async function startRecording() {
    outputDiv.innerText = "Listening... 🎤";
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorder.onstop = processRecording;

        audioChunks = [];
        mediaRecorder.start();

        setTimeout(() => mediaRecorder.stop(), 5000); // stop after 5 seconds
    } catch (error) {
        console.error("Microphone access error:", error);
        outputDiv.innerText = "Error accessing microphone!";
    }
}

// 🔊 Process Audio
async function processRecording() {
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
        const response = await fetch("http://localhost:3000/speech-to-text", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        const transcript = data.transcript;

        if (!transcript) {
            outputDiv.innerText = "Couldn't recognize speech. Try again!";
            return;
        }

        outputDiv.innerText = `You said: "${transcript}"`;
        checkForMistakes(transcript);
    } catch (error) {
        console.error("Error processing recording:", error);
        outputDiv.innerText = "Error processing speech. Please try again!";
    }
}

// 📝 Check for Mistakes
async function checkForMistakes(transcript) {
    try {
        const response = await fetch("http://localhost:3000/checkMistake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript }),
        });

        const data = await response.json();
        const correction = data.correction;

        if (correction && correction !== transcript) {
            outputDiv.innerText += `\nCorrection: "${correction}"`;
            speakCorrection(correction);
        }
    } catch (error) {
        console.error("Error checking for mistakes:", error);
        outputDiv.innerText = "Error with AI. Please try again!";
    }
}

// 🔊 Speak Correction
function speakCorrection(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}

// 🎤 Button Click Event
startButton.addEventListener("click", startRecording);
