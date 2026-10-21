import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

let landmarker: HandLandmarker | null = null;
let loading: Promise<HandLandmarker> | null = null;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (loading) return loading;
  loading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "/mediapipe/tasks-vision-0.10.35/wasm",
    );
    const hl = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "/mediapipe/models/hand_landmarker-float16-v1.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });
    landmarker = hl;
    return hl;
  })();
  return loading;
}
