import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export const POSE_MODEL_PATH = '/models/pose_landmarker_lite.task';
export const MEDIAPIPE_WASM_PATH = '/mediapipe/wasm';

async function ensureModelFileExists() {
  try {
    const response = await fetch(POSE_MODEL_PATH, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error();
    }
  } catch {
    throw new Error(
      'Pose model file not found. Place public/models/pose_landmarker_lite.task in your project.'
    );
  }
}

export async function createPoseLandmarker() {
  // The pose model runs in the browser and turns each video frame into body landmarks.
  await ensureModelFileExists();

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL_PATH,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

export { PoseLandmarker };
