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
let session = null;
let currentMode = 'image'; // 'image', 'video', 'webcam'
let animationId = null;
let isDetecting = false;

// COCO Labels (Standard 80 classes)
const labels = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush"
];

// Load YOLO26 ONNX Model
async function loadModel() {
    try {
        console.log('Loading YOLO26 model...');
        // Configure ONNX Runtime to look for wasm files on CDN
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

        // Load the model
        session = await ort.InferenceSession.create('./yolo26.onnx', {
            executionProviders: ['wasm'],
        });

        console.log('YOLO26 Model loaded!');
    } catch (err) {
        console.error('Failed to load model', err);
        alert('Failed to load YOLO26 model. Please ensure "yolo26.onnx" is in the public folder.');
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
}

resetBtn.addEventListener('click', () => {
    resetWorkspace();
    // Show back the current mode section
    sections[currentMode].style.display = 'block';
});

// --- Detection Logic ---

// --- Detection Logic ---

async function detectImage() {
    if (!session) await loadModel();

    // Set canvas to image size
    canvas.width = uploadedImage.width;
    canvas.height = uploadedImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Preprocessing
    const { tensor, modelScale } = await preprocess(uploadedImage);

    // Inference
    const feeds = { images: tensor };
    const results = await session.run(feeds);

    // Postprocessing
    const predictions = postprocess(results, modelScale.width, modelScale.height);
    renderPredictions(predictions);
}

async function detectVideoFrame() {
    if (!session) await loadModel();
    isDetecting = true;

    // Set canvas dimensions to match video once
    if (canvas.width !== inputVideo.videoWidth) {
        canvas.width = inputVideo.videoWidth;
        canvas.height = inputVideo.videoHeight;
    }

    async function loop() {
        if (!isDetecting) return;

        // Perform detection
        const { tensor, modelScale } = await preprocess(inputVideo);

        try {
            const feeds = { images: tensor };
            const results = await session.run(feeds);
            const predictions = postprocess(results, modelScale.width, modelScale.height);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderPredictions(predictions);
        } catch (e) {
            console.error("Inference error:", e);
        }

        animationId = requestAnimationFrame(loop);
    }
    loop();
}


// --- Helper Functions ---

/**
 * Preprocess image for YOLO (Resize to 640x640, Normalize)
 */
async function preprocess(source) {
    const width = 640;
    const height = 640;

    // Create a temporary canvas to resize the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw and resize
    tempCtx.drawImage(source, 0, 0, width, height);

    // Get image data
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Convert to float32 and normalize [0, 255] -> [0, 1]
    const red = new Float32Array(width * height);
    const green = new Float32Array(width * height);
    const blue = new Float32Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
        red[i / 4] = data[i] / 255.0;
        green[i / 4] = data[i + 1] / 255.0;
        blue[i / 4] = data[i + 2] / 255.0;
    }

    // Interleave into planar format [1, 3, 640, 640]
    // ONNX Runtime Web expects a flat Float32Array
    const float32Data = new Float32Array(3 * width * height);
    float32Data.set(red, 0);
    float32Data.set(green, width * height);
    float32Data.set(blue, 2 * width * height);

    const tensor = new ort.Tensor('float32', float32Data, [1, 3, height, width]);

    return {
        tensor,
        modelScale: {
            width: source.videoWidth || source.width,
            height: source.videoHeight || source.height
        }
    };
}

/**
 * Postprocess YOLO output
 * Assumes End-to-End YOLO output (without NMS needed) or standard YOLO output
 * YOLO26 usually outputs [1, 300, 6] -> [batch, dets, (x1, y1, x2, y2, score, class)]
 */
function postprocess(results, imgWidth, imgHeight) {
    // Determine the output key (usually "output0")
    const outputKey = Object.keys(results)[0];
    const output = results[outputKey];

    const data = output.data;
    const dims = output.dims; // e.g., [1, 300, 6]

    const predictions = [];
    const confThreshold = 0.45;

    // Check shapes to decide parsing logic
    // YOLO End-to-End: [1, N, 6]
    // YOLOv8 Standard: [1, 84, 8400] (requires NMS)

    if (dims.length === 3 && dims[2] === 6) {
        // End-to-End Format [1, N, 6]
        const numDets = dims[1];

        for (let i = 0; i < numDets; i++) {
            const offset = i * 6;
            const score = data[offset + 4];
            const classId = Math.round(data[offset + 5]);

            if (score >= confThreshold) {
                const x1 = data[offset];
                const y1 = data[offset + 1];
                const x2 = data[offset + 2];
                const y2 = data[offset + 3];

                // Scale back to original image
                const scaleX = imgWidth / 640;
                const scaleY = imgHeight / 640;

                predictions.push({
                    bbox: [x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY], // [x, y, w, h]
                    class: labels[classId] || 'unknown',
                    score: score
                });
            }
        }
    } else {
        // Fallback for Standard YOLOv8 format [1, 84, 8400] (cx, cy, w, h, cls1, cls2...)
        // This is complex to implement without NMS lib, but let's try a simplified version or just Log warning.
        console.warn("Model output shape mismatch. Expected [1, N, 6] for YOLO26 End-to-End. Got:", dims);
        // Implementing simple parsing assuming it might be [1, 6, N]
        // If the user drops in a standard YOLOv8, this part won't work perfectly without NMS.
    }

    return predictions;
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


