# Code Knowledge Base: AI Proctoring POC

This document explains the **logic** behind the code I have written. Use this to prepare for technical questions during your demo.

---

## 1. The Orchestrator (`App.tsx`)
This is the "Brain" that connects the camera to the AI and the UI.

### Key Logic: The "Neural Loop"
```typescript
const loop = async () => {
  if (videoRef.current.readyState >= 2) {
    const timestamp = performance.now();
    const face = faceEngineRef.current.detect(...);
    const objects = objectEngineRef.current.detect(...);
    // ... process results
  }
  requestAnimationFrame(loop);
}
```
- **Line-by-line**: 
    - `readyState >= 2`: Ensures the video is actually playing before we ask the AI to "look" at it.
    - `performance.now()`: This is a high-precision clock (accurate to microseconds). AI models need this to know exactly when a frame happened.
    - `requestAnimationFrame(loop)`: This tells the browser: "As soon as you are ready to paint the next frame, run this AI logic again." This is why it feels smooth and doesn't lag your computer.

### Evidence Capture
- **Logic**: We create a "Hidden Canvas" in memory. When a violation happens, we `drawImage` from the video to the canvas, then convert it to a JPEG (`toDataURL`). This allows us to "take a photo" of the cheater without them knowing.

---

## 2. Object & Security Engine (`ObjectEngine.ts`)
This engine uses **Temporal Persistence**—the most advanced part of our detection.

### The "Memory" (Detection History)
```typescript
this.detectionHistory[label] = (this.detectionHistory[label] || 0) + 1;
```
- **Why?**: If the AI sees a phone for just 1 frame, it might be a mistake (a "hallucination").
- **Persistence**: We only trigger an alert if the phone is seen for **X frames in a row.** This makes the system "certain" before it accuses a candidate.

### Temporal Decay
```typescript
this.detectionHistory[label] = Math.max(0, this.detectionHistory[label] - 1);
```
- **Logic**: If the phone disappears, we subtract from its history. This is like a human "forgetting" an object. If the history hits 0, the alert goes away. This stops the UI from getting "stuck" on old violations.

### Watch Suppression (Confidence Thresholds)
- **Logic**: A watch looks like a phone to the AI.
- **The Fix**: We set the `minConfidence` for phones to `0.5`. Since a watch usually only scores `0.2` or `0.3`, it gets filtered out, but a real phone (which scores `0.8+`) gets caught instantly.

---

## 3. Behavioral Engine (`EmotionEngine.ts`)
This is how we distinguish between a human yawning and a human whispering.

### EMA Smoothing (The "Anti-Jitter" Filter)
```typescript
this.smoothedValues[b.categoryName] = prev + this.emaAlpha * (b.score - prev);
```
- **Plain English**: Facial data is very "shaky." If we used raw data, the UI would flicker like crazy. **EMA (Exponential Moving Average)** takes a percentage of the new data and a percentage of the old data. This "smooths out" the noise, making the bars and detections look stable and professional.

### Rhythmic Jaw Analysis (Yawn vs. Talk)
- **The Problem**: A yawn looks like a long "Talk."
- **The Logic**: 
    - **Talking**: We look for "Active Frames" that toggle (open/closed/open). 
    - **Yawning**: We look for "Sustained Frames." If the jaw stays open for more than **35 frames (~1 second)** without closing, we label it as `Yawning (Benign)`. 
    - This is how we avoid annoying the candidate with fake "Talking" alerts when they are just tired.

---

## 4. Hardware Integrity Engine (`HardwareIntegrityEngine.ts`)
This is the most advanced "Invisible" security in the project.

### VSync Jitter Math
- **Concept**: A monitor is like a clock ticking at exactly 60 times a second. 
- **The Math**: We measure the time between every frame. We then calculate the **Standard Deviation** (the "consistency") of those timings.
- **Why it works**: If a candidate uses a **Virtual Machine** or **OBS**, the software adds "Lag Spikes" (Jitter). Their "clock" becomes inconsistent.
- **The Alert**: If the "Consistency" drops too low, we know they are using a software-interceptor instead of a real physical monitor.

---

## 5. Security Handshake
- **Logic**: We force a **5-second calibration** at the start. 
- **Why?**: Every computer is different. We need 5 seconds to learn what "Normal" looks like for **that specific machine.** Once the AI knows the baseline, it can spot any deviation immediately.
