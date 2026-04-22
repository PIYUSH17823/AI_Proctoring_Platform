# Developer Integration & Handover Guide: AI Proctoring Platform

**Target Audience**: Hyrai Full-Stack Engineering Team  
**Subject**: Integrating the Neural Proctoring POC into Production  

---

## 1. Technical Architecture Overview
The platform is built on **Modular Edge-Inference.** Instead of a single monolithic detector, we use four specialized engines that run in parallel on the client's browser.

### The Engine Registry:
- **`FaceEngine.ts`**: Handles MediaPipe FaceLandmarker (478 points). Tracks head pose and iris movement.
- **`ObjectEngine.ts`**: Handles MediaPipe ObjectDetector (EfficientDet-Lite0). Includes temporal persistence and "Watch Suppression" logic.
- **`EmotionEngine.ts`**: Maps 52 blendshapes to human behaviors (Talking, Yawning, Stress).
- **`HardwareIntegrityEngine.ts`**: Measures VSync Jitter (frame timing variance) to detect Virtual Machines.

---

## 2. Mandatory Assets
To run the AI, you must host the following files in your frontend's `/public` or static asset directory:

### AI Models (`/public/models/`)
- `face_landmarker.task`: For face/gaze/emotion.
- `efficientdet_lite0.tflite`: For object/phone detection.

### WASM Files (`/public/wasm/`)
- MediaPipe tasks-vision WASM files (Internal module, Nosimd, etc.). These are required for the FilesetResolver to initialize the worker threads.

---

## 3. Frontend Integration Flow

### Step 1: Engine Initialization
Initialize all engines inside a `useRef` or a singleton to prevent re-instantiation on every render.
```typescript
const faceEngine = new FaceEngine();
await faceEngine.initialize();
```

### Step 2: The Neural Loop
Use `requestAnimationFrame` to poll the `HTMLVideoElement`.
- **Note**: Ensure the video's `readyState` is `>= 2` before passing to engines.
- **Timestamp**: Always use `performance.now()` for the detector's timestamp, NOT `Date.now()`.

### Step 3: Incident Management
Store detections in an "Incident Rail" state. Use unique keys (e.g., `label + timestamp`) to avoid React reconciliation issues.

---

## 4. Key Logic "Gotchas" (Read Carefully)

- **Intake Mode Priority**: In `App.tsx`, we have logic that prioritizes prohibited items. If a phone is detected, **Intake Mode must be suppressed**, even if a bottle is visible.
- **Temporal Decay**: In `ObjectEngine.ts`, we use a "History Buffer." Detections must persist for X frames to trigger an alert, and must be absent for Y frames to be "forgotten." This prevents UI flicker.
- **Hardware Integrity**: The `HardwareIntegrityEngine` requires a **5-second calibration period** at the start of each session to learn the user's specific monitor refresh rhythm.

---

## 5. Backend (FastAPI) Requirements
- **Logging Endpoint**: `/api/poc/log` should accept a JSON body containing the `label`, `severity`, and `timestamp`.
- **Rate Limiting**: Implement `SlowAPI` to limit log submissions to 1 per 5 seconds per candidate.

---

## 6. Security Headers
For WASM and SharedArrayBuffer to work, your production server must send:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`
