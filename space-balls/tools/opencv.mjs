let runtimePromise;

/** Load the pinned OpenCV.js WASM runtime once, resolving only when it is ready. */
export function loadOpenCv() {
  // Import an ESM adapter so bundlers never wrap the package's Promise itself
  // as a module namespace (which would inherit an unusable Promise.then).
  runtimePromise ??= import('./opencv-runtime.mjs').then(({ cvModule }) => cvModule);
  return runtimePromise;
}
