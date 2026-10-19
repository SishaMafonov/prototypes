/** Resolves to the shared OpenCV.js runtime after WebAssembly initialization. */
export function loadOpenCv(): Promise<typeof import('@techstark/opencv-js')>;
