// Self-hosted MediaPipe files (see scripts/copy-mediapipe-assets.mjs).
// The version must match the exact pin of @mediapipe/tasks-vision in
// package.json, because the WASM folder is named after the installed version.
export const MEDIAPIPE_WASM_URL = "/mediapipe/tasks-vision-0.10.35/wasm";
export const HAND_MODEL_URL = "/mediapipe/models/hand_landmarker-float16-v1.task";
