// Global variables
let gl;
let renderer;
let camera;
let conv1, conv2, conv3, conv4;
let mlp1, mlp2;
let inputTensor;
let tv1, tv2, tv3, tv4, tv5, tv6, tv7, tv8;
let cv1, cv2, cv3, cv4;
let rv;
let mv1, mv2;

let convBoxSize, mlpBoxSize;

// Drawing variables
let drawCanvas;
let drawCtx;
let prevMouseX = -1;
let prevMouseY = -1;
let canvasX, canvasY, canvasW, canvasH;
let canvasLeft, canvasRight, canvasTop, canvasBottom;

let visualizing = false;
const SECONDS_UNTIL_RESET = 120;
const DURATION_IN_MS = SECONDS_UNTIL_RESET * 1000; // Duration in milliseconds
let visualizationStartTime = 0;
let frameCount = 0;

// Animation speed multiplier (1.0 = normal speed, 2.0 = 2x faster, 0.5 = 2x slower)
// Change this value to adjust the overall animation speed
// Make it accessible globally so Box.js can use it
window.ANIMATION_SPEED_MULTIPLIER = 4.0;
const ANIMATION_SPEED_MULTIPLIER = window.ANIMATION_SPEED_MULTIPLIER; // Also available as const

// Debug flag: set to true to enable activation value logging in console
const DEBUG_ACTIVATIONS = false;

// Framerate tracking
let lastFpsTime = performance.now();
let fpsFrameCount = 0;
const FPS_UPDATE_INTERVAL = 1000; // Update FPS every second

// Data files
let randomTensorData;
let conv1WeightData, conv1BiasData;
let conv2WeightData, conv2BiasData;
let conv3WeightData, conv3BiasData;
let conv4WeightData, conv4BiasData;
let mlp1WeightData, mlp1BiasData;
let mlp2WeightData, mlp2BiasData;

let dataLoaded = false;

// Cache for neural network results
let cachedResults = null;
let lastInputTensorHash = null;

// Load data files
async function loadData() {
    try {
        const files = [
            'data/randomTensor.txt',
            'data/conv1Weight.txt', 'data/conv1Bias.txt',
            'data/conv2Weight.txt', 'data/conv2Bias.txt',
            'data/conv3Weight.txt', 'data/conv3Bias.txt',
            'data/conv4Weight.txt', 'data/conv4Bias.txt',
            'data/mlp1Weight.txt', 'data/mlp1Bias.txt',
            'data/mlp2Weight.txt', 'data/mlp2Bias.txt'
        ];

        const responses = await Promise.all(files.map(file => fetch(file)));
        const texts = await Promise.all(responses.map(r => r.text()));

        // Filter out empty lines from data
        randomTensorData = texts[0].trim().split('\n').filter(line => line.trim().length > 0);
        conv1WeightData = texts[1].trim().split('\n').filter(line => line.trim().length > 0);
        conv1BiasData = texts[2].trim().split('\n').filter(line => line.trim().length > 0);
        conv2WeightData = texts[3].trim().split('\n').filter(line => line.trim().length > 0);
        conv2BiasData = texts[4].trim().split('\n').filter(line => line.trim().length > 0);
        conv3WeightData = texts[5].trim().split('\n').filter(line => line.trim().length > 0);
        conv3BiasData = texts[6].trim().split('\n').filter(line => line.trim().length > 0);
        conv4WeightData = texts[7].trim().split('\n').filter(line => line.trim().length > 0);
        conv4BiasData = texts[8].trim().split('\n').filter(line => line.trim().length > 0);
        mlp1WeightData = texts[9].trim().split('\n').filter(line => line.trim().length > 0);
        mlp1BiasData = texts[10].trim().split('\n').filter(line => line.trim().length > 0);
        mlp2WeightData = texts[11].trim().split('\n').filter(line => line.trim().length > 0);
        mlp2BiasData = texts[12].trim().split('\n').filter(line => line.trim().length > 0);

        dataLoaded = true;
        setupVisualizer();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function initWebGL() {
    const canvas = document.getElementById('glCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    renderer = new WebGLRenderer(gl);

    // Enable depth testing for proper 3D rendering
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.CULL_FACE);

    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear to black
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Initialize camera - orbital camera to see the scene (objects at z from -1500 to 1700)
    camera = new Camera();

    convBoxSize = new Vec3(12, 12, 12);
    mlpBoxSize = new Vec3(4, 12, 12);

    setupInputPage();
    loadData();
}

function setupVisualizer() {
    if (!dataLoaded) return;

    inputTensor = parseConvWeightsToTensor(randomTensorData);

    conv1 = new Conv2D("conv1Weight.txt", "conv1Bias.txt", conv1WeightData, conv1BiasData);
    conv2 = new Conv2D("conv2Weight.txt", "conv2Bias.txt", conv2WeightData, conv2BiasData);
    conv3 = new Conv2D("conv3Weight.txt", "conv3Bias.txt", conv3WeightData, conv3BiasData);
    conv4 = new Conv2D("conv4Weight.txt", "conv4Bias.txt", conv4WeightData, conv4BiasData);
    mlp1 = new MLP("mlp1Weight.txt", "mlp1Bias.txt", true, mlp1WeightData, mlp1BiasData);
    mlp2 = new MLP("mlp2Weight.txt", "mlp2Bias.txt", false, mlp2WeightData, mlp2BiasData);

    const conv1Result = conv1.forward(inputTensor);
    const conv2Result = conv2.forward(conv1Result);
    const conv3Result = conv3.forward(conv2Result);
    const conv4Result = conv4.forward(conv3Result);
    const flattened = conv4Result.clone();
    flattened._reshape(flattened.getShape().getTotalSize(), 1);

    const mlp1Result = mlp1.forward(flattened);
    const mlp2Result = mlp2.forward(mlp1Result);
    const result = softmax(mlp2Result);

    tv1 = new TensorVisualizer(inputTensor, new Vec3(0, 0, -1500), 20, convBoxSize);
    tv1.setVisible(true);
    tv2 = new TensorVisualizer(conv1Result, new Vec3(0, 0, -1100), 20, convBoxSize);
    tv3 = new TensorVisualizer(conv2Result, new Vec3(0, 0, -500), 20, convBoxSize);
    tv4 = new TensorVisualizer(conv3Result, new Vec3(0, 0, 250), 20, convBoxSize);
    tv5 = new TensorVisualizer(conv4Result, new Vec3(0, 0, 1000), 20, convBoxSize);
    tv6 = new TensorVisualizer(flattened, new Vec3(0, 0, 1500), 6, mlpBoxSize);
    tv7 = new TensorVisualizer(mlp1Result, new Vec3(0, 0, 1600), 6, mlpBoxSize);
    tv8 = new TensorVisualizer(result, new Vec3(0, 0, 1700), 80, mlpBoxSize);

    mv2 = new MLPVisualizer(mlp2, tv7, tv8, mlpBoxSize);
    mv1 = new MLPVisualizer(mlp1, tv6, tv7, mlpBoxSize);
    mv1.setNextAnimation(mv2);

    rv = new ReshapeVisualizer(tv5, tv6, mlpBoxSize);
    rv.setNextAnimation(mv1);

    cv4 = new Conv2DVisualizer(conv4, tv4, tv5, 1, convBoxSize);
    cv4.setNextAnimation(rv);
    cv3 = new Conv2DVisualizer(conv3, tv3, tv4, 2, convBoxSize);
    cv3.setNextAnimation(cv4);
    cv2 = new Conv2DVisualizer(conv2, tv2, tv3, 2, convBoxSize);
    cv2.setNextAnimation(cv3);
    cv1 = new Conv2DVisualizer(conv1, tv1, tv2, 16, convBoxSize);
    cv1.setNextAnimation(cv2);
}

function setupInputPage() {
    drawCanvas = document.getElementById('drawCanvas');
    drawCtx = drawCanvas.getContext('2d');
    drawCtx.fillStyle = 'black';
    drawCtx.fillRect(0, 0, 32, 32);
    drawCtx.strokeStyle = 'white';
    drawCtx.lineWidth = 2.4;

    canvasW = 400;
    canvasH = 400;
    canvasX = window.innerWidth / 2;
    canvasY = window.innerHeight / 2 - 50;

    canvasLeft = canvasX - canvasW / 2;
    canvasRight = canvasX + canvasW / 2;
    canvasTop = canvasY - canvasH / 2;
    canvasBottom = canvasY + canvasH / 2;

    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.style.width = canvasW + 'px';
    canvasContainer.style.height = canvasH + 'px';
    canvasContainer.style.left = canvasLeft + 'px';
    canvasContainer.style.top = canvasTop + 'px';

    drawCanvas.style.width = canvasW + 'px';
    drawCanvas.style.height = canvasH + 'px';
    drawCanvas.style.imageRendering = 'pixelated';
}

function tensorHash(tensor) {
    let hash = 0;
    for (let i = 0; i < Math.min(tensor.data.length, 100); i++) {
        hash = ((hash << 5) - hash) + tensor.data[i];
        hash = hash & hash;
    }
    return hash;
}

// Debug function to log activation values
function logActivations(results) {
    if (!DEBUG_ACTIVATIONS) return;

    console.log('=== Activation Values ===');

    const layers = [
        { name: 'Input', tensor: inputTensor },
        { name: 'Conv1 Output', tensor: results.conv1Result },
        { name: 'Conv2 Output', tensor: results.conv2Result },
        { name: 'Conv3 Output', tensor: results.conv3Result },
        { name: 'Conv4 Output', tensor: results.conv4Result },
        { name: 'Flattened', tensor: results.flattened },
        { name: 'MLP1 Output', tensor: results.mlp1Result },
        { name: 'MLP2 Output', tensor: results.mlp2Result },
        { name: 'Final (Softmax)', tensor: results.result }
    ];

    layers.forEach(layer => {
        const data = layer.tensor.data;
        const shape = layer.tensor.shape.toString();
        const min = Math.min(...data);
        const max = Math.max(...data);
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / data.length;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);

        // Sample first 10 values
        const sample = data.slice(0, Math.min(10, data.length));

        console.log(`\n${layer.name}:`);
        console.log(`  Shape: ${shape}`);
        console.log(`  Size: ${data.length}`);
        console.log(`  Min: ${min.toFixed(6)}`);
        console.log(`  Max: ${max.toFixed(6)}`);
        console.log(`  Mean: ${mean.toFixed(6)}`);
        console.log(`  Std Dev: ${stdDev.toFixed(6)}`);
        console.log(`  Sample (first 10): [${sample.map(v => v.toFixed(4)).join(', ')}]`);

        // For final softmax output, also show the predicted class
        if (layer.name === 'Final (Softmax)') {
            const maxIndex = data.indexOf(max);
            console.log(`  Predicted Class: ${maxIndex} (confidence: ${(max * 100).toFixed(2)}%)`);
            console.log(`  All Class Probabilities: [${data.map(v => (v * 100).toFixed(2)).join('%, ')}%]`);
        }
    });

    console.log('========================\n');
}

function drawVisualization() {
    // Hide UI elements
    document.getElementById('ui').style.display = 'none';

    // Ensure viewport is set
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Cache neural network results
    const currentHash = tensorHash(inputTensor);
    if (!cachedResults || lastInputTensorHash !== currentHash) {
        const conv1Result = conv1.forward(inputTensor);
        const conv2Result = conv2.forward(conv1Result);
        const conv3Result = conv3.forward(conv2Result);
        const conv4Result = conv4.forward(conv3Result);
        const flattened = conv4Result.clone();
        flattened._reshape(flattened.getShape().getTotalSize(), 1);

        const mlp1Result = mlp1.forward(flattened);
        const mlp2Result = mlp2.forward(mlp1Result);
        const result = softmax(mlp2Result);

        cachedResults = {
            conv1Result,
            conv2Result,
            conv3Result,
            conv4Result,
            flattened,
            mlp1Result,
            mlp2Result,
            result
        };
        lastInputTensorHash = currentHash;

        // Log activation values if debugging is enabled
        logActivations(cachedResults);
    }

    tv1.setTensor(inputTensor);
    tv2.setTensor(cachedResults.conv1Result);
    tv3.setTensor(cachedResults.conv2Result);
    tv4.setTensor(cachedResults.conv3Result);
    tv5.setTensor(cachedResults.conv4Result);
    tv6.setTensor(cachedResults.flattened);
    tv7.setTensor(cachedResults.mlp1Result);
    tv8.setTensor(cachedResults.result);

    // Clear canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up projection and view matrices
    const aspect = gl.canvas.width / gl.canvas.height;
    const fov = Math.PI / 4; // 45 degrees
    const near = 10;
    const far = 5000;
    const projectionMatrix = WebGLUtils.createPerspective(fov, aspect, near, far);

    const viewMatrix = camera.getViewMatrix();
    const mvpMatrix = WebGLUtils.multiplyMatrices(projectionMatrix, viewMatrix);

    // Collect all visible boxes
    const allBoxes = [];
    allBoxes.push(...tv1.getVisibleBoxes());
    allBoxes.push(...tv2.getVisibleBoxes());
    allBoxes.push(...tv3.getVisibleBoxes());
    allBoxes.push(...tv4.getVisibleBoxes());
    allBoxes.push(...tv5.getVisibleBoxes());
    allBoxes.push(...tv6.getVisibleBoxes());
    allBoxes.push(...tv7.getVisibleBoxes());
    allBoxes.push(...tv8.getVisibleBoxes());
    allBoxes.push(...cv1.getVisibleBoxes());
    allBoxes.push(...cv2.getVisibleBoxes());
    allBoxes.push(...cv3.getVisibleBoxes());
    allBoxes.push(...cv4.getVisibleBoxes());
    allBoxes.push(...rv.getVisibleBoxes());
    allBoxes.push(...mv1.getVisibleBoxes());
    allBoxes.push(...mv2.getVisibleBoxes());

    // Render all boxes
    if (allBoxes.length > 0) {
        renderer.renderBoxes(allBoxes, mvpMatrix);
    }

    // Get current time for time-based animations
    const currentTime = performance.now();

    // Update all visualizers with current time
    if (tv1) {
        tv1.update(currentTime);
        tv2.update(currentTime);
        tv3.update(currentTime);
        tv4.update(currentTime);
        tv5.update(currentTime);
        tv6.update(currentTime);
        tv7.update(currentTime);
        tv8.update(currentTime);
        cv1.update(currentTime);
        cv2.update(currentTime);
        cv3.update(currentTime);
        cv4.update(currentTime);
        rv.update(currentTime);
        mv1.update(currentTime);
        mv2.update(currentTime);
    }

    // Check if visualization duration has elapsed
    const elapsedTime = currentTime - visualizationStartTime;
    if (elapsedTime >= DURATION_IN_MS) {
        visualizing = false;
        visualizationStartTime = 0;
    }
}

function drawInputPage() {
    // Clear WebGL canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Show UI elements
    document.getElementById('ui').style.display = 'block';
}

function reset() {
    if (!tv1) return; // Not initialized yet

    tv2.setVisible(false);
    tv3.setVisible(false);
    tv4.setVisible(false);
    tv5.setVisible(false);
    tv6.setVisible(false);
    tv7.setVisible(false);
    tv8.setVisible(false);

    cv1.reset();
    cv2.reset();
    cv3.reset();
    cv4.reset();

    rv.reset();

    mv1.reset();
    mv2.reset();

    cv1.start();
}

function startVisualization() {
    visualizing = true;
    visualizationStartTime = performance.now();

    // Convert canvas pixels to tensor
    const imageData = drawCtx.getImageData(0, 0, 32, 32);
    const pixels = imageData.data;

    // Create input tensor from pixels
    inputTensor = new Tensor(1, 1, 32, 32);
    for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        const row = Math.floor(pixelIndex / 32);
        const col = pixelIndex % 32;
        const val = pixels[i] / 255.0; // Use red channel
        inputTensor.set(val, 0, 0, row, col);
    }

    // Clear canvas
    drawCtx.fillStyle = 'black';
    drawCtx.fillRect(0, 0, 32, 32);

    // Invalidate cache
    cachedResults = null;
    lastInputTensorHash = null;

    reset();
}

// Event handlers
let isDrawing = false;

document.getElementById('drawCanvas').addEventListener('mousedown', (e) => {
    if (!visualizing) {
        isDrawing = true;
        const rect = drawCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (32 / rect.width);
        const y = (e.clientY - rect.top) * (32 / rect.height);
        prevMouseX = x;
        prevMouseY = y;
    }
});

document.getElementById('drawCanvas').addEventListener('mousemove', (e) => {
    if (isDrawing && !visualizing) {
        const rect = drawCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (32 / rect.width);
        const y = (e.clientY - rect.top) * (32 / rect.height);

        drawCtx.beginPath();
        drawCtx.moveTo(prevMouseX, prevMouseY);
        drawCtx.lineTo(x, y);
        drawCtx.stroke();

        prevMouseX = x;
        prevMouseY = y;
    }
});

document.getElementById('drawCanvas').addEventListener('mouseup', () => {
    isDrawing = false;
});

document.getElementById('drawCanvas').addEventListener('mouseleave', () => {
    isDrawing = false;
});

document.getElementById('button').addEventListener('click', () => {
    if (!visualizing) {
        startVisualization();
    }
});

// Mouse controls for camera
const glCanvas = document.getElementById('glCanvas');

glCanvas.addEventListener('mousedown', (e) => {
    if (visualizing) {
        camera.handleMouseDown(e.clientX, e.clientY);
        glCanvas.style.cursor = 'grabbing';
    }
});

glCanvas.addEventListener('mousemove', (e) => {
    if (visualizing) {
        camera.handleMouseMove(e.clientX, e.clientY);
    }
});

glCanvas.addEventListener('mouseup', () => {
    if (visualizing) {
        camera.handleMouseUp();
        glCanvas.style.cursor = 'default';
    }
});

glCanvas.addEventListener('mouseleave', () => {
    if (visualizing) {
        camera.handleMouseUp();
        glCanvas.style.cursor = 'default';
    }
});

glCanvas.addEventListener('wheel', (e) => {
    if (visualizing) {
        e.preventDefault();
        camera.handleWheel(e.deltaY);
    }
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (visualizing) {
        // Prevent default behavior for arrow keys and W/S to avoid page scrolling
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
        }
        camera.setKey(e.key, true);
        if (e.key === 'c' || e.key === 'C') {
            reset();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (visualizing) {
        camera.setKey(e.key, false);
    }
});

// Animation loop
function animate() {
    frameCount++;
    fpsFrameCount++;

    // Calculate and print FPS occasionally
    const currentTime = performance.now();
    const elapsed = currentTime - lastFpsTime;
    if (elapsed >= FPS_UPDATE_INTERVAL) {
        const fps = Math.round((fpsFrameCount / elapsed) * 1000);
        console.log(`FPS: ${fps}`);
        fpsFrameCount = 0;
        lastFpsTime = currentTime;
    }

    if (visualizing) {
        camera.update();
        drawVisualization();
    } else {
        drawInputPage();
    }

    requestAnimationFrame(animate);
}

// Initialize on load
window.addEventListener('load', () => {
    initWebGL();
    animate();
});

window.addEventListener('resize', () => {
    if (gl) {
        gl.canvas.width = window.innerWidth;
        gl.canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Update canvas position
        canvasX = window.innerWidth / 2;
        canvasY = window.innerHeight / 2 - 50;
        canvasLeft = canvasX - canvasW / 2;
        canvasRight = canvasX + canvasW / 2;
        canvasTop = canvasY - canvasH / 2;
        canvasBottom = canvasY + canvasH / 2;

        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.left = canvasLeft + 'px';
        canvasContainer.style.top = canvasTop + 'px';
    }
});
