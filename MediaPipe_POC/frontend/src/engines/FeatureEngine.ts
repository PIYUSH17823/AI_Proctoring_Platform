/**
 * FeatureEngine
 * Converts raw 3D landmarks into pose-invariant geometric ratios.
 */
export class FeatureEngine {
  /**
   * Processes raw landmarks into a 52-dimensional feature vector.
   * Scaled by eye-to-eye distance (The Anchor).
   */
  static extract(landmarks: any[]): number[] {
    if (!landmarks || landmarks.length === 0) return new Array(52).fill(0);

    // 1. Calculate the Face Anchor (Eye-to-Eye distance)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const faceScale = this.getDistance(leftEye, rightEye);

    const features: number[] = [];

    // --- FEATURE MAP (Geometric Ratios) ---
    
    // Feature 0: Mouth Aperture
    features.push(this.getNormalizedDist(landmarks[13], landmarks[14], faceScale)); 
    
    // Feature 1-2: Eyelid Aperture (L/R)
    features.push(this.getNormalizedDist(landmarks[159], landmarks[145], faceScale)); 
    features.push(this.getNormalizedDist(landmarks[386], landmarks[374], faceScale)); 

    // Feature 3: Inner Brow Height
    features.push(this.getNormalizedDist(landmarks[107], landmarks[9], faceScale)); 

    // Fill the remaining slots for the 52-dim model input
    while (features.length < 52) features.push(0);

    return features;
  }

  private static getDistance(p1: any, p2: any): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }

  private static getNormalizedDist(p1: any, p2: any, scale: number): number {
    return this.getDistance(p1, p2) / (scale + 0.0001);
  }
}
