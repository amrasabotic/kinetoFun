// Loads MediaPipe Tasks Vision HandLandmarker from CDN.
// Keeps the dependency out of the bundle and avoids SSR issues.

let loaderPromise: Promise<any> | null = null;

export async function loadHandLandmarker() {
  if (typeof window === "undefined") throw new Error("HandLandmarker is browser-only");
  if (!loaderPromise) {
    loaderPromise = (async () => {
      const url =
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
      const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
      const vision: any = await dynImport(url);
      const { FilesetResolver, HandLandmarker } = vision;
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "/mediapipe/models/hand_landmarker-float16-v1.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      return handLandmarker;
    })();
  }
  return loaderPromise;
}