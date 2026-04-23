import * as tf from '@tensorflow/tfjs';

/**
 * NeuralEngine
 * Follows the POC engine pattern for managing a TensorFlow.js model.
 */
export class NeuralEngine {
  private model: tf.LayersModel | null = null;
  private readonly MODEL_PATH = '/models/behavioral/v1/model.json';

  async initialize(): Promise<void> {
    try {
      console.log('🧠 [POC] NeuralEngine: Booting GPU...');
      
      // Wait for the hardware to be ready
      await tf.ready();
      
      // Load our specific versioned brain
      try {
        this.model = await tf.loadLayersModel(this.MODEL_PATH);
        console.log('✅ [POC] Neural Model Loaded.');
        this.warmup();
      } catch (e) {
        console.warn('⚠️ [POC] No model.json found. Running in MOCK MODE for testing.');
      }
    } catch (error) {
      console.error('❌ [POC] Neural Engine Initialization Failed:', error);
      throw error;
    }
  }

  private warmup(): void {
    if (!this.model) return;

    tf.tidy(() => {
      // Send a single "empty" face through the model
      const dummyInput = tf.zeros([1, 52]);
      this.model!.predict(dummyInput);
    });
    console.log('🔥 [POC] Neural Engine Warmed Up.');
  }

  /**
   * Run inference on a vector of normalized features.
   */
  predict(features: number[]): number[] {
    // Fallback Mock: If no model is loaded, return 7 random probabilities
    if (!this.model) {
      return Array.from({ length: 7 }, () => Math.random());
    }

    return tf.tidy(() => {
      const input = tf.tensor2d([features]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      
      // Sync the results from the GPU back to JavaScript
      return Array.from(prediction.dataSync());
    });
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log('♻️ [POC] Neural Engine Resources Released.');
    }
  }
}
