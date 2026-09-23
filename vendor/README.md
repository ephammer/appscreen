# Vendored libraries

Served locally instead of from a CDN so the desktop (Tauri) app works offline and the
page doesn't depend on third-party script hosts. Files are unmodified copies.

| File | Version | Source | License |
|------|---------|--------|---------|
| `jszip.min.js` | 3.10.1 | https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js | MIT or GPLv3 |
| `three.min.js` | r128 | https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | MIT |
| `GLTFLoader.js` | 0.128.0 | `three@0.128.0` npm package, `examples/js/loaders/GLTFLoader.js` | MIT |
| `OrbitControls.js` | 0.128.0 | `three@0.128.0` npm package, `examples/js/controls/OrbitControls.js` | MIT |

To update, download the new versions from the same sources and check them against the
published SRI hashes (cdnjs) or the npm tarball.
