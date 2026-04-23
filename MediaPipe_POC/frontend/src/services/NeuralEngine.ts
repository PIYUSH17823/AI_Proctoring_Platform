import * as tf from '@tensorflow/tfjs';

/**
 * NeuralEngine Service (POC Edition)
 * Manages the lifecycle of the AI model within the MediaPipe_POC environment.
 */
export class NeuralEngine {
  private model: tf.LayersModel | null = null;
  private readonly MODEL_PATH = '/models/behavioral/v1/model.json';

  /**
   * Initializes the engine and prepares the GPU.
   */
  async initialize(): Promise<void> {
    try {
      console.log('🧠 [POC] NeuralEngine: Initializing...');
      
      await tf.ready();
      console.log(`🚀 [POC] Backend: ${tf.getBackend()}`);

      this.model = await tf.loadLayersModel(this.MODEL_PATH);
      console.log('✅ [POC] Model loaded.');

      this.warmup();
    } catch (error) {
      console.error('❌ [POC] Engine Failed:', error);
    }
  }

  /**
   * GPU Warmup: Prevents first-frame lag.
   */
  private warmup(): void {
    if (!this.model) return;

    tf.tidy(() => {
      console.log('🔥 [POC] Warming up...');
      const dummyInput = tf.zeros([1, 52]);
      this.model!.predict(dummyInput);
    });
  }

  /**
   * Real-time Prediction with Memory Safety.
   */
  predict(features: number[]): number[] {
    if (!this.model) throw new Error('Engine not ready');

    return tf.tidy(() => {
      const input = tf.tensor2d([features]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      return Array.from(prediction.dataSync());
    });
  }

  /**
   * Release resources.
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log('♻️ [POC] GPU released.');
    }
  }
}

export const neuralEngine = new NeuralEngine();
