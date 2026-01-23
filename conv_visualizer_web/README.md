# CNN Visualizer - Web

A browser-based WebGL implementation of the CNN visualization, combining:
- Input screen from `conv_visualizer_webgl`
- 3D rendering pipeline and camera controls from `webgl_test`
- Visualization logic ported from `conv_visualizer_web` (p5.js)

## Features

- **Drawing Interface**: Draw numbers 0-9 on a 32x32 canvas
- **3D Visualization**: Real-time WebGL visualization of CNN layers
- **Orbital Camera**: Mouse drag to rotate, scroll to zoom
- **Layer Animation**: Animated visualization of convolutional and MLP layers

## Usage

1. Serve the files using a local web server (required for loading data files):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```
2. Draw a number (0-9) on the canvas
3. Click "Predict" to start the visualization
4. Use mouse to rotate camera, scroll wheel to zoom
5. Press 'C' to restart the animation

## Architecture

### Core Classes
- `Tensor.js`: Tensor data structure and operations
- `Conv2D.js`: Convolutional layer implementation
- `MLP.js`: Multi-layer perceptron implementation
- `Box.js`: 3D box representation for tensor visualization

### Visualization Classes
- `TensorVisualizer.js`: Visualizes tensor data as 3D boxes
- `Conv2DVisualizer.js`: Animates convolutional layer operations
- `MLPVisualizer.js`: Animates MLP layer operations
- `ReshapeVisualizer.js`: Animates tensor reshaping
- `Animation.js`: Base class for animations

### Rendering
- `WebGLRenderer.js`: WebGL renderer for drawing boxes
- `webgl-utils.js`: Matrix operations and WebGL utilities
- `camera.js`: Orbital camera controller

### Main
- `main.js`: Main application logic, event handling, and animation loop

## File Structure

```
conv_visualizer_webgl_2/
├── index.html          # Main HTML file
├── js/
│   ├── main.js         # Main application
│   ├── webgl-utils.js  # WebGL utilities
│   ├── camera.js       # Camera controller
│   ├── WebGLRenderer.js # WebGL renderer
│   ├── Tensor.js       # Tensor class
│   ├── Conv2D.js       # Conv2D layer
│   ├── MLP.js          # MLP layer
│   ├── Box.js          # Box class
│   ├── Animation.js    # Animation base
│   ├── TensorVisualizer.js
│   ├── Conv2DVisualizer.js
│   ├── MLPVisualizer.js
│   ├── ReshapeVisualizer.js
│   └── utils.js        # Utility functions
└── data/               # Neural network weights and data
```

## Differences from Original

- Uses standard WebGL (not WebGL2) for broader compatibility
- Orbital camera instead of first-person camera
- Vec3 class instead of p5.Vector
- Simplified rendering without instancing (for compatibility)
