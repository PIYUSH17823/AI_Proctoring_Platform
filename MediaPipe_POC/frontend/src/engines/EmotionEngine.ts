import { type Category } from "@mediapipe/tasks-vision";

export interface EmotionResults {
  isTalking: boolean;
  isSurprised: boolean;
  isAnxious: boolean;
  isSuppressed: boolean;
  anomalyScore: number;
  state: string;
}

export class EmotionEngine {
  private emaAlpha = 0.2;
  private smoothedValues: Record<string, number> = {};

  private THRESHOLDS = {
    TALK_JAW: 0.15,
    SURPRISE_EYE: 0.4,
    STRESS_BROW: 0.3,
  };

  process(blendshapes: Category[], isDrinking: boolean = false): EmotionResults {
    // 1. Smooth the raw data
    blendshapes.forEach(b => {
      const prev = this.smoothedValues[b.categoryName] || 0;
      this.smoothedValues[b.categoryName] = prev + this.emaAlpha * (b.score - prev);
    });

    // 2. Extract key metrics
    const jawOpen = this.smoothedValues["jawOpen"] || 0;
    const mouthLowerDown = this.smoothedValues["mouthLowerDownLeft"] || 0;
    const eyeWide = Math.max(this.smoothedValues["eyeWideLeft"] || 0, this.smoothedValues["eyeWideRight"] || 0);
    const browInnerUp = this.smoothedValues["browInnerUp"] || 0;
    const browDown = Math.max(this.smoothedValues["browDownLeft"] || 0, this.smoothedValues["browDownRight"] || 0);

    // 3. Behavioral Logic
    const isTalking = (jawOpen > this.THRESHOLDS.TALK_JAW || mouthLowerDown > this.THRESHOLDS.TALK_JAW) && !isDrinking;
    const isSurprised = eyeWide > this.THRESHOLDS.SURPRISE_EYE && !isDrinking;
    const isAnxious = browInnerUp > this.THRESHOLDS.STRESS_BROW && browDown < 0.2 && !isDrinking;
    const isSuppressed = isDrinking;

    // 4. Calculate Anomaly Score
    let score = 0;
    if (isTalking) score += 40;
    if (isSurprised) score += 30;
    if (isAnxious) score += 20;

    score = Math.min(score, 100);

    let state = "Neutral / Focused";
    if (isDrinking) state = "🥤 Intake Mode";
    else if (isTalking) state = "Talking / Whispering";
    else if (isSurprised) state = "Peripheral Alert";
    else if (isAnxious) state = "Distressed";

    return {
      isTalking,
      isSurprised,
      isAnxious,
      isSuppressed,
      anomalyScore: score,
      state
    };
  }
}
