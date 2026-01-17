# CNN Visualizer - Web Version

This is a port of the Processing-based CNN visualizer to p5.js for web browser compatibility.

## Setup

1. Copy all data files from `../conv_visualizer/visualizer/data/` to `./data/`:
   - `randomTensor.txt`
   - `conv1Weight.txt`, `conv1Bias.txt`
   - `conv2Weight.txt`, `conv2Bias.txt`
   - `conv3Weight.txt`, `conv3Bias.txt`
   - `conv4Weight.txt`, `conv4Bias.txt`
   - `mlp1Weight.txt`, `mlp1Bias.txt`
   - `mlp2Weight.txt`, `mlp2Bias.txt`

2. Open `index.html` in a web browser. For best results, use a local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (with http-server installed)
   npx http-server
   ```
   Then navigate to `http://localhost:8000`

## Usage

1. Draw a number (0-9) on the canvas
2. Click the "Predict" button to start the visualization
3. The visualization will show how the neural network processes your drawing
4. Use mouse to rotate the camera (drag) and zoom (scroll wheel)
5. Press 'c' to reset the visualization

## Differences from Processing Version

- Simplified rendering (no OpenGL instancing shaders - uses standard p5.js box rendering)
- Camera controls implemented with basic orbit controller
- File loading uses p5.js preload() function
- Drawing canvas integrated directly (no OSC communication needed)
- Camera state files (`.ser`) are not loaded (can be added as JSON if needed)

## Browser Requirements

- Modern web browser with WebGL support
- JavaScript enabled
- For best performance, use Chrome, Firefox, or Edge
