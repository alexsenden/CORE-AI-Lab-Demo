// Global variables
let cam;
let conv1, conv2, conv3, conv4;
let mlp1, mlp2;
let inputTensor;
let tv1, tv2, tv3, tv4, tv5, tv6, tv7, tv8, tv9;
let cv1, cv2, cv3, cv4;
let rv;
let mv1, mv2;
let pg; // Drawing canvas

let convBoxSize, mlpBoxSize;

// Drawing variables
let prevMouseX = -1;
let prevMouseY = -1;
let sendButton;
let canvasX, canvasY, canvasW, canvasH;
let canvasLeft, canvasRight, canvasTop, canvasBottom;
let canvasYOffset = 100;

let visualizing = false;
const SECONDS_UNTIL_RESET = 75;
const FRAMERATE = 25;
const DURATION_IN_FRAMES = SECONDS_UNTIL_RESET * FRAMERATE;
let currentFrame = 0;

// Data files
let randomTensorData;
let conv1WeightData, conv1BiasData;
let conv2WeightData, conv2BiasData;
let conv3WeightData, conv3BiasData;
let conv4WeightData, conv4BiasData;
let mlp1WeightData, mlp1BiasData;
let mlp2WeightData, mlp2BiasData;

let dataLoaded = false;
let defaultFont;

function preload() {
  // Load data files
  randomTensorData = loadStrings('data/randomTensor.txt');
  conv1WeightData = loadStrings('data/conv1Weight.txt');
  conv1BiasData = loadStrings('data/conv1Bias.txt');
  conv2WeightData = loadStrings('data/conv2Weight.txt');
  conv2BiasData = loadStrings('data/conv2Bias.txt');
  conv3WeightData = loadStrings('data/conv3Weight.txt');
  conv3BiasData = loadStrings('data/conv3Bias.txt');
  conv4WeightData = loadStrings('data/conv4Weight.txt');
  conv4BiasData = loadStrings('data/conv4Bias.txt');
  mlp1WeightData = loadStrings('data/mlp1Weight.txt');
  mlp1BiasData = loadStrings('data/mlp1Bias.txt');
  mlp2WeightData = loadStrings('data/mlp2Weight.txt');
  mlp2BiasData = loadStrings('data/mlp2Bias.txt');

  // Load default font for WebGL text rendering
  // WebGL mode requires a font file to be loaded via loadFont()
  // Using a sans-serif font from a reliable CDN
  // Note: If font loading fails, you can download a .ttf font file and use: loadFont('assets/font.ttf')
  // Using a .ttf font from jsDelivr CDN (Arial-like font)
  defaultFont = loadFont('https://cdn.jsdelivr.net/npm/@fontsource/roboto@4.5.8/files/roboto-latin-400-normal.woff');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(FRAMERATE);

  // Set font for WebGL mode (required before drawing any text)
  if (defaultFont) {
    textFont(defaultFont);
  } else {
    // If font didn't load, create a default font object
    // This is a fallback, but WebGL really needs a loaded font
    console.warn('Font not loaded, text may not render correctly in WebGL mode');
  }

  cam = new CameraController(this, 400);

  convBoxSize = createVector(12, 12, 12);
  mlpBoxSize = createVector(4, 12, 12);

  setupVisualizer();
  setupInputPage();
}

function setupVisualizer() {
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

  tv1 = new TensorVisualizer(inputTensor, createVector(0, 0, -1500), 20, convBoxSize);
  tv1.setVisible(true);
  tv2 = new TensorVisualizer(conv1Result, createVector(0, 0, -1100), 20, convBoxSize);
  tv3 = new TensorVisualizer(conv2Result, createVector(0, 0, -500), 20, convBoxSize);
  tv4 = new TensorVisualizer(conv3Result, createVector(0, 0, 250), 20, convBoxSize);
  tv5 = new TensorVisualizer(conv4Result, createVector(0, 0, 1000), 20, convBoxSize);
  tv6 = new TensorVisualizer(flattened, createVector(0, 0, 1500), 6, mlpBoxSize);
  tv7 = new TensorVisualizer(mlp1Result, createVector(0, 0, 1600), 6, mlpBoxSize);
  tv8 = new TensorVisualizer(result, createVector(0, 0, 1700), 80, mlpBoxSize);

  mv2 = new MLPVisualizer(mlp2, tv7, tv8);
  mv1 = new MLPVisualizer(mlp1, tv6, tv7);
  mv1.setNextAnimation(mv2);

  rv = new ReshapeVisualizer(tv5, tv6);
  rv.setNextAnimation(mv1);
  // Note: Camera state loading would need JSON conversion - simplified for now

  cv4 = new Conv2DVisualizer(conv4, tv4, tv5, 1);
  cv4.setNextAnimation(rv);
  cv3 = new Conv2DVisualizer(conv3, tv3, tv4, 2);
  cv3.setNextAnimation(cv4);
  cv2 = new Conv2DVisualizer(conv2, tv2, tv3, 2);
  cv2.setNextAnimation(cv3);
  cv1 = new Conv2DVisualizer(conv1, tv1, tv2, 16);
  cv1.setNextAnimation(cv2);
}

function setupInputPage() {
  pg = createGraphics(32, 32);
  pg.pixelDensity(1);
  pg.background(0);

  const buttonWidth = 300;
  const buttonHeight = 80;
  canvasW = 400;
  canvasH = 400;

  // Center everything vertically, with better spacing
  canvasX = width / 2;
  canvasY = height / 2 - 50; // Slightly above center

  canvasLeft = canvasX - canvasW / 2;
  canvasRight = canvasX + canvasW / 2;
  canvasTop = canvasY - canvasH / 2;
  canvasBottom = canvasY + canvasH / 2;

  // Button positioned below canvas with nice spacing
  const buttonLeft = canvasX - buttonWidth / 2;
  const buttonTop = canvasY - canvasH / 2;

  sendButton = new Button(buttonLeft, buttonTop, buttonWidth, buttonHeight, "Predict", () => {
    console.log("Button Clicked!");
    startVisualization();
  });
}

function draw() {
  if (visualizing) {
    drawVisualization();
  } else {
    drawInputPage();
  }
}

function drawVisualization() {
  const conv1Result = conv1.forward(inputTensor);
  const conv2Result = conv2.forward(conv1Result);
  const conv3Result = conv3.forward(conv2Result);
  const conv4Result = conv4.forward(conv3Result);
  const flattened = conv4Result.clone();
  flattened._reshape(flattened.getShape().getTotalSize(), 1);

  const mlp1Result = mlp1.forward(flattened);
  const mlp2Result = mlp2.forward(mlp1Result);
  const result = softmax(mlp2Result);

  tv1.setTensor(inputTensor);
  tv2.setTensor(conv1Result);
  tv3.setTensor(conv2Result);
  tv4.setTensor(conv3Result);
  tv5.setTensor(conv4Result);
  tv6.setTensor(flattened);
  tv7.setTensor(mlp1Result);
  tv8.setTensor(result);

  background(0);

  push();
  cam.apply();

  tv1.draw();
  tv2.draw();
  tv3.draw();
  tv4.draw();
  tv5.draw();
  tv6.draw();
  tv7.draw();
  tv8.draw();

  cv1.draw();
  cv2.draw();
  cv3.draw();
  cv4.draw();

  rv.draw();

  mv1.draw();
  mv2.draw();

  drawAnswers(tv8);
  pop();

  tv1.update();
  tv2.update();
  tv3.update();
  tv4.update();
  tv5.update();
  tv6.update();
  tv7.update();
  tv8.update();
  cv1.update();
  cv2.update();
  cv3.update();
  cv4.update();
  rv.update();
  mv1.update();
  mv2.update();

  currentFrame++;
  if (currentFrame >= DURATION_IN_FRAMES) {
    visualizing = false;
    currentFrame = 0;
  }
}

function drawInputPage() {
  // Draw on the canvas
  if (mouseIsPressed && !visualizing) {
    // Check if mouse is over canvas area
    if (mouseX >= canvasLeft && mouseX <= canvasRight &&
      mouseY >= canvasTop + canvasYOffset && mouseY <= canvasBottom + canvasYOffset) {
      if (prevMouseX === -1) {
        prevMouseX = mouseX;
        prevMouseY = mouseY;
      }

      // Convert screen coordinates to canvas coordinates
      const canvasMouseX = map(mouseX, canvasLeft, canvasRight, 0, 32);
      const canvasMouseY = map(mouseY, canvasTop + canvasYOffset, canvasBottom + canvasYOffset, 0, 32);
      const canvasPrevX = map(prevMouseX, canvasLeft, canvasRight, 0, 32);
      const canvasPrevY = map(prevMouseY, canvasTop + canvasYOffset, canvasBottom + canvasYOffset, 0, 32);

      pg.stroke(255);
      pg.strokeWeight(2.4);
      pg.line(canvasMouseX, canvasMouseY, canvasPrevX, canvasPrevY);

      prevMouseX = mouseX;
      prevMouseY = mouseY;
    }
  }

  // Draw 2D overlay - WebGL uses centered coordinates after resetMatrix()
  background(0);

  push();
  resetMatrix();

  // Set up orthographic projection for screen-space rendering
  // Use standard ortho where Y increases upward, but we'll convert coordinates accordingly
  ortho(-width / 2, width / 2, -height / 2, height / 2, -1000, 1000);

  // Convert screen coordinates (0,0 at top-left) to centered coordinates
  // X: centered = screen - width/2
  // Y: In WebGL, Y increases upward, but screen Y increases downward
  // screenY=0 (top) should map to centeredY=height/2 (top in WebGL)
  // screenY=height (bottom) should map to centeredY=-height/2 (bottom in WebGL)
  // Formula: centeredY = height/2 - screenY
  const canvasXCentered = canvasX - width / 2;
  const canvasYCentered = height / 2 - canvasY;
  const canvasLeftCentered = canvasLeft - width / 2;
  const canvasTopCentered = height / 2 - canvasTop;

  // Draw canvas image
  push();
  translate(canvasLeftCentered + canvasW / 2, canvasTopCentered - canvasH / 2);
  image(pg, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
  pop();

  // Draw canvas border - align with canvas image position
  // Canvas image is drawn at (canvasLeftCentered + canvasW/2, canvasTopCentered - canvasH/2) with offset (-canvasW/2, -canvasH/2)
  // So top-left is at (canvasLeftCentered, canvasTopCentered - canvasH)
  stroke(255);
  strokeWeight(6);
  noFill();
  rect(canvasLeftCentered, canvasTopCentered - canvasH, canvasW, canvasH);

  // Instruction text above canvas
  push();
  translate(canvasXCentered, canvasYCentered - canvasH / 2 - 160);
  if (defaultFont) {
    textFont(defaultFont);
  }
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Draw a number between 0 and 9", 0, 0);
  textSize(20);
  text("The network will classify your drawing", 0, 30);
  pop();

  // Draw button (convert button coordinates)
  const buttonXCentered = sendButton.x - width / 2;
  const buttonYCentered = sendButton.y - height / 2;
  sendButton.checkHover();

  // Button background
  if (sendButton.isClicked) {
    fill(sendButton.clickColor[0], sendButton.clickColor[1], sendButton.clickColor[2]);
  } else if (sendButton.isHovered) {
    fill(sendButton.hoverColor[0], sendButton.hoverColor[1], sendButton.hoverColor[2]);
  } else {
    fill(sendButton.defaultColor[0], sendButton.defaultColor[1], sendButton.defaultColor[2]);
  }
  noStroke();
  rect(buttonXCentered, buttonYCentered, sendButton.w, sendButton.h);

  // Button text
  push();
  translate(buttonXCentered + sendButton.w / 2, buttonYCentered + sendButton.h / 2);
  if (defaultFont) {
    textFont(defaultFont);
  }
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(36);
  text(sendButton.text, 0, 0);
  pop();

  pop();
}

function keyPressed() {
  if (key === 'c' || key === 'C') {
    reset();
  }
}

function reset() {
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

  // Convert canvas pixels to tensor
  pg.loadPixels();
  const pixels = pg.pixels;

  // Create input tensor from pixels
  inputTensor = new Tensor(1, 1, 32, 32);
  for (let i = 0; i < pixels.length; i += 4) {
    const pixelIndex = i / 4;
    const row = Math.floor(pixelIndex / 32);
    const col = pixelIndex % 32;
    // Extract grayscale value (using red channel, all should be same for grayscale)
    const val = pixels[i] / 255.0;
    inputTensor.set(val, 0, 0, row, col);
  }

  // Clear canvas
  pg.background(0);

  reset();
}

function mousePressed() {
  if (!visualizing) {
    sendButton.checkClick();
  }
  cam.handleMousePressed();
}

function mouseReleased() {
  sendButton.resetClick();
  prevMouseX = -1;
  prevMouseY = -1;
  cam.handleMouseReleased();
}

function mouseDragged() {
  cam.handleMouseDragged();
}

function mouseWheel(event) {
  cam.handleWheel(event);
}

function drawAnswers(tv) {
  push();
  // Set font before drawing text
  if (defaultFont) {
    textFont(defaultFont);
  }
  for (let i = 0; i < tv.boxes.length; i++) {
    if (tv.boxes[i].isVisible) {
      const pos = tv.boxes[i].curPos;
      textSize(15);
      fill(255);
      text(i, pos.x, pos.y + 30, pos.z);
    }
  }
  pop();
}
