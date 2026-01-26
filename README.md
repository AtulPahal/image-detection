# Oculus Vision

Oculus Vision is a next-generation, privacy-focused object detection web application powered by [TensorFlow.js](https://www.tensorflow.org/js) and the [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) model.

Built with a modern, responsive design, it offers real-time object detection directly in your browser without sending any data to a server.

## ✨ Features

- **Multiple Detection Modes**:
  - 🖼️ **Image Analysis**: Drag & drop or upload local images for instant object detection.
  - 🎥 **Video Analysis**: Upload videos to detect objects frame-by-frame.
  - 📹 **Live Webcam**: Real-time object detection using your camera.
- **Privacy First**: All processing happens client-side using TensorFlow.js. Your images and videos never leave your device.
- **Modern UI/UX**:
  - Smooth animations and glassmorphism design.
  - 🌓 Dark/Light mode toggle.
  - Responsive layout for all devices.

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **AI/ML**: TensorFlow.js, COCO-SSD Pre-trained Model
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

2. Install dependencies (if any are added in the future):
   ```bash
   bun install
   ```

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
│   ├── index.html      # Main entry point (UI & Structure)
│   ├── script.js       # Core logic (TF.js integration, UI handling)
│   └── style.css       # Styling (Themes, Animations)
├── server.js           # Bun HTTP server
├── package.json        # Project metadata and scripts
└── README.md           # Project documentation
```

