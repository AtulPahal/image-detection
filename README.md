# Oculus Vision
 
Oculus Vision is a next-generation, privacy-focused object detection web application powered by **YOLO26** (the latest state-of-the-art vision model) and **ONNX Runtime Web**.

Built with a modern, responsive design and the ultra-fast [Bun](https://bun.sh) runtime, it offers real-time object detection directly in your browser without sending any data to a server.

## ✨ Features

- **⚡ State-of-the-Art AI**: Uses **YOLO26n** (Nano) for incredible speed and accuracy.
- **🛡️ Privacy First**: All inference runs locally in your browser using WebAssembly. No images are uploaded to the cloud.
- **🚀 Multiple Detection Modes**:
  - 🖼️ **Image Analysis**: Drag & drop or upload local images.
  - 🎥 **Video Analysis**: Upload videos to detect objects frame-by-frame.
  - 📹 **Live Webcam**: Real-time object detection using your camera.
- **🎨 Modern UI/UX**:
  - Glassmorphism design system.
  - 🌓 Dark/Light mode toggle.
  - Responsive layout for all devices.

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **AI Engine**: [ONNX Runtime Web](https://onnxruntime.ai/) (WASM Backend) 
- **Model**: YOLO26 Nano (End-to-End)
- **Fonts**: Google Fonts (Outfit)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/image-detection.git
   cd image-detection
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

   *Note: The project includes the `yolo26.onnx` model in the `public/` folder. You do not need to download it separately.*

### Running the App

Start the local development server:

```bash
bun start
```

Open your browser and navigate to `http://localhost:3000` to start using Oculus Vision.

## 📂 Project Structure

```
image-detection/
├── public/
│   ├── index.html      # Main UI
│   ├── script.js       # App Logic (ONNX Model loading & Inference)
│   ├── style.css       # Styles
│   └── yolo26.onnx     # The YOLO26 AI Model
├── server.js           # Bun HTTP server
├── package.json        # Project metadata
└── README.md           # Documentation
```

