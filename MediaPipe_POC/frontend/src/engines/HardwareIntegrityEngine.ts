export interface IntegrityResults {
  jitter: number;        // Current frame jitter in ms
  variance: number;      // Standard deviation over buffer
  trustScore: number;    // 0.0 - 1.0 (Hardware Trust)
  isCalibrated: boolean;
  isCompromised: boolean;
}

export class HardwareIntegrityEngine {
  private buffer: number[] = [];
  private bufferSize = 100;
  private lastTimestamp = 0;
  
  private baselineVariance = 0;
  private calibrationFrames = 0;
  private isCalibrating = false;
  private debugMode = false;
  private targetCalibration = 300; // ~5 seconds at 60fps

  setDebugMode(active: boolean) {
    this.debugMode = active;
  }

  private results: IntegrityResults = {
    jitter: 0,
    variance: 0,
    trustScore: 1.0,
    isCalibrated: false,
    isCompromised: false
  };

  /**
   * Starts a 5-second calibration to baseline the user's specific monitor
   */
  startCalibration() {
    this.isCalibrating = true;
    this.buffer = [];
    this.calibrationFrames = 0;
    this.baselineVariance = 0;
  }

  /**
   * Feed a frame timestamp into the engine
   */
  processFrame(timestamp: number): IntegrityResults {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return this.results;
    }

    let interval = timestamp - this.lastTimestamp;
    
    // SIMULATED JITTER: If debug mode is on, inject 5-30ms of random instability
    if (this.debugMode && !this.isCalibrating) {
      interval += (Math.random() * 25) + 5;
    }

    this.lastTimestamp = timestamp;

    // Reject outliers (e.g. tab was hidden and resumed)
    if (interval > 100) return this.results;

    this.buffer.push(interval);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Calculate Variance (Standard Deviation)
    const stats = this.calculateStats(this.buffer);
    this.results.jitter = Math.abs(interval - stats.mean);
    this.results.variance = stats.stdDev;

    if (this.isCalibrating) {
      this.calibrationFrames++;
      if (this.calibrationFrames >= this.targetCalibration) {
        this.baselineVariance = stats.stdDev;
        this.isCalibrating = false;
        this.results.isCalibrated = true;
      }
    } else if (this.results.isCalibrated) {
      const jitterRatio = stats.stdDev / (this.baselineVariance || 0.1);
      this.results.trustScore = Math.max(0, 1 - (jitterRatio - 1) / 3);
      this.results.isCompromised = stats.stdDev > 7 || (jitterRatio > 4 && stats.stdDev > 4);
    }

    return { ...this.results }; // CRITICAL: Return a new object so React re-renders
  }

  private calculateStats(data: number[]) {
    const n = data.length;
    if (n === 0) return { mean: 0, stdDev: 0 };
    const mean = data.reduce((a, b) => a + b) / n;
    const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    return { mean, stdDev };
  }

  getCalibrationProgress(): number {
    return Math.min(100, (this.calibrationFrames / this.targetCalibration) * 100);
  }
}
