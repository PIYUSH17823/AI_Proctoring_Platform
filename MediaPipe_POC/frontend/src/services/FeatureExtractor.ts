/**
 * FeatureExtractor Service (POC Edition)
 * Normalizes facial points into scale-invariant geometric ratios.
 */
export class FeatureExtractor {
  /**
   * Turns raw 478 points into 52 smart features.
   */
  static extractFeatures(landmarks: any[]): number[] {
    if (!landmarks || landmarks.length === 0) return new Array(52).fill(0);

    // 1. Get the 'Face Scale' (Distance between left and right eyes)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const faceScale = this.getDistance(leftEye, rightEye);

    const features: number[] = [];

    // --- FEATURE EXTRACTION EXAMPLES ---
    
    // Feature 0: Mouth Openness (Inner Lip Dist / Face Scale)
    features.push(this.getNormalizedDist(landmarks[13], landmarks[14], faceScale)); 
    
    // Feature 1: Left Eye Openness
    features.push(this.getNormalizedDist(landmarks[159], landmarks[145], faceScale)); 

    // Feature 2: Right Eye Openness
    features.push(this.getNormalizedDist(landmarks[386], landmarks[374], faceScale)); 

    // ... In a production setup, we'd fill all 52 based on the model's training ...
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
