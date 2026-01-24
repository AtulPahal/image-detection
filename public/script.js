// DOM Elements
const dropZone = document.getElementById('image-drop-zone');
const imageInput = document.getElementById('image-input');
const videoZone = document.getElementById('video-drop-zone');
const videoInput = document.getElementById('video-input');
const webcamTrigger = document.getElementById('webcam-trigger');

const workspace = document.getElementById('workspace');
const uploadedImage = document.getElementById('uploaded-image');
const inputVideo = document.getElementById('input-video');
const canvas = document.getElementById('detection-canvas');
const ctx = canvas.getContext('2d');
const resultsList = document.getElementById('results-list');
const resetBtn = document.getElementById('reset-btn');
const voiceToggle = document.getElementById('voice-toggle');
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

const tabs = document.querySelectorAll('.tab-btn');
const sections = {
    image: document.getElementById('image-section'),
    video: document.getElementById('video-section'),
    webcam: document.getElementById('webcam-section')
};

// Theme Logic
themeToggle.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.body.removeAttribute('data-theme');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        localStorage.setItem('theme', 'light');
    }
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
}

// State
let model = null;
let currentMode = 'image'; // 'image', 'video', 'webcam'
let animationId = null;
let isDetecting = false;
let lastSpokenTime = 0;
let lastSpokenObjects = '';

// Load SSD Model
async function loadModel() {
    try {
        console.log('Loading model...');
        // Load the model.
        model = await cocoSsd.load();
        console.log('Model loaded!');
    } catch (err) {
        console.error('Failed to load model', err);
        alert('Failed to load AI model. Please check your connection.');
    }
}
loadModel();

// --- Tab Navigation ---
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Switch Tabs UI
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Switch Sections
        const mode = tab.dataset.mode;
        currentMode = mode;

        // Hide all sections
        Object.values(sections).forEach(s => {
            s.style.display = 'none';
            s.classList.remove('active-section');
        });

        // Reset Workspace
        resetWorkspace();

        // Show selected section
        sections[mode].style.display = 'block';
        sections[mode].classList.add('active-section');
    });
});

// --- Image Handler ---
dropZone.addEventListener('click', () => imageInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--surface-border)'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--surface-border)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImage(file);
});
imageInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImage(e.target.files[0]); });

function handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = 'block';
        inputVideo.style.display = 'none';

        uploadedImage.onload = () => {
            enterWorkspace();
            detectImage();
        };
    };
    reader.readAsDataURL(file);
}

// --- Video Handler ---
videoZone.addEventListener('click', () => videoInput.click());
videoZone.addEventListener('dragover', (e) => { e.preventDefault(); videoZone.style.borderColor = 'var(--primary)'; });
videoZone.addEventListener('dragleave', (e) => { e.preventDefault(); videoZone.style.borderColor = 'var(--surface-border)'; });
videoZone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoZone.style.borderColor = 'var(--surface-border)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) handleVideo(file);
});
videoInput.addEventListener('change', (e) => { if (e.target.files[0]) handleVideo(e.target.files[0]); });

function handleVideo(file) {
    const url = URL.createObjectURL(file);
    startVideoDetection(url);
}

// --- Webcam Handler ---
webcamTrigger.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        inputVideo.srcObject = stream;
        inputVideo.onloadedmetadata = () => {
            inputVideo.play();
            enterWorkspace();
            detectVideoFrame();
        };
        // Explicitly show video element
        uploadedImage.style.display = 'none';
        inputVideo.style.display = 'block';
    } catch (err) {
        console.error("Webcam error:", err);
        alert("Could not access webcam. Please ensure permission is granted.");
    }
});

function startVideoDetection(src) {
    inputVideo.src = src;
    inputVideo.loop = true;
    inputVideo.muted = true; // Ensure muted to allow autoplay usually

    uploadedImage.style.display = 'none';
    inputVideo.style.display = 'block';

    inputVideo.onloadeddata = () => {
        inputVideo.play();
        enterWorkspace();
        detectVideoFrame();
    };
}


// --- Workspace & Logic ---
function enterWorkspace() {
    // Hide all upload sections
    Object.values(sections).forEach(s => s.style.display = 'none');
    workspace.style.display = 'grid';
}

function resetWorkspace() {
    // Stop loops
    isDetecting = false;
    if (animationId) cancelAnimationFrame(animationId);

    // Stop Media
    inputVideo.pause();
    inputVideo.src = "";
    if (inputVideo.srcObject) {
        inputVideo.srcObject.getTracks().forEach(track => track.stop());
        inputVideo.srcObject = null;
    }

    // Reset UI
    workspace.style.display = 'none';
    uploadedImage.src = '#';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultsList.innerHTML = '<div class="result-item placeholder"><span>Processing...</span></div>';

    // Reset Inputs
    imageInput.value = '';
    videoInput.value = '';

    window.speechSynthesis.cancel();
}

resetBtn.addEventListener('click', () => {
    resetWorkspace();
    // Show back the current mode section
    sections[currentMode].style.display = 'block';
});

// --- Detection Logic ---

async function detectImage() {
    if (!model) await loadModel();

    canvas.width = uploadedImage.width;
    canvas.height = uploadedImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const predictions = await model.detect(uploadedImage);
    renderPredictions(predictions);
    speakDetections(predictions, true); // Force speak for single image
}

async function detectVideoFrame() {
    if (!model) await loadModel();
    isDetecting = true;

    // Set canvas dimensions to match video once
    if (canvas.width !== inputVideo.videoWidth) {
        canvas.width = inputVideo.videoWidth;
        canvas.height = inputVideo.videoHeight;
    }

    async function loop() {
        if (!isDetecting) return;

        // Detect
        const predictions = await model.detect(inputVideo);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPredictions(predictions);

        // Throttled Speak
        speakDetections(predictions, false);

        animationId = requestAnimationFrame(loop);
    }
    loop();
}

function renderPredictions(predictions) {
    resultsList.innerHTML = '';

    if (predictions.length === 0) {
        resultsList.innerHTML = '<div class="result-item"><span>No objects detected</span></div>';
        return;
    }

    predictions.forEach(prediction => {
        drawBoundingBox(prediction);
        addResultToList(prediction);
    });
}

function drawBoundingBox(prediction) {
    const [x, y, width, height] = prediction.bbox;
    const text = prediction.class;

    // Generate color
    const color = getColorForClass(text);

    // Box
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    // Text Label
    const textString = `${text} ${Math.round(prediction.score * 100)}%`;
    ctx.font = '18px Outfit';
    const textWidth = ctx.measureText(textString).width;

    ctx.fillStyle = color;
    ctx.fillRect(x, y > 20 ? y - 25 : y, textWidth + 10, 25);

    ctx.fillStyle = '#fff';
    ctx.fillText(textString, x + 5, y > 20 ? y - 7 : y + 18);
}

function addResultToList(prediction) {
    const item = document.createElement('div');
    item.classList.add('result-item');

    const name = document.createElement('span');
    name.classList.add('label-name');
    name.textContent = prediction.class;

    const score = document.createElement('span');
    score.classList.add('confidence-score');
    score.textContent = Math.round(prediction.score * 100) + '%';

    // Dot
    const dot = document.createElement('div');
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = getColorForClass(prediction.class);
    dot.style.marginRight = '10px';

    const leftContainer = document.createElement('div');
    leftContainer.style.display = 'flex';
    leftContainer.style.alignItems = 'center';
    leftContainer.appendChild(dot);
    leftContainer.appendChild(name);

    item.appendChild(leftContainer);
    item.appendChild(score);

    resultsList.appendChild(item);
}

function getColorForClass(className) {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
        hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// --- Enhanced TTS ---

function getBestVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google English, or any English
    return voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
}

function speakDetections(predictions, force = false) {
    if (!voiceToggle.checked) return;

    const now = Date.now();
    // For video/webcam: only speak every 5 seconds to avoid spam
    if (!force && (now - lastSpokenTime < 5000)) return;

    if (predictions.length === 0) return;

    // Summarize
    const counts = {};
    predictions.forEach(p => counts[p.class] = (counts[p.class] || 0) + 1);

    const parts = [];
    for (const [cls, count] of Object.entries(counts)) {
        parts.push(`${count} ${cls}${count > 1 ? 's' : ''}`);
    }

    parts.sort(); // Sort to make comparison consistent
    const currentSpokenObjects = parts.join(', ');

    // If we just saw the exact same thing, maybe don't say it again unless forced (or enough time passed)
    if (!force && currentSpokenObjects === lastSpokenObjects && (now - lastSpokenTime < 8000)) {
        return;
    }

    let text = "I see ";
    if (parts.length === 1) {
        text += parts[0] + ".";
    } else {
        const last = parts.pop();
        text += parts.join(", ") + ", and " + last + ".";
    }

    lastSpokenTime = now;
    lastSpokenObjects = currentSpokenObjects;

    const utterance = new SpeechSynthesisUtterance(text);

    // Set Voice
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

    // Adjust Rate/Pitch
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
}

// Initialize voices (sometimes they load asynchronously)
window.speechSynthesis.onvoiceschanged = () => {
    // Just to ensure they are loaded
    getBestVoice();
};
