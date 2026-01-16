int getIndex(Shape shape, int... indices) {
  int index = 0;
  for (int i = 0; i < indices.length; i++) {
    // Check if current dimension exceeds valid range
    if (indices[i] < 0 || indices[i] >= shape.get(i)) {
      // If out of range, treat as padding
      return -1; // Exception handling index (treated as padding area)
    }
    index = index * shape.get(i) + indices[i];
  }
  return index;
}

int[] index1DTo2D(int idx, Shape shape) {
  if (shape.getNumDimensions() != 2) {
    throw new IllegalArgumentException("Shape must have exactly 2 dimensions.");
  }
  int totalSize = shape.getTotalSize();

  idx = Math.floorMod(idx, totalSize);

  int dimX = shape.getDimension(0);
  int dimY = shape.getDimension(1);

  int idxY = idx % dimY;
  int idxX = idx / dimY;

  return new int[]{idxX, idxY};
}

int[] index1DTo3D(int idx, Shape shape) {
  if (shape.getNumDimensions() != 3) {
    throw new IllegalArgumentException("Shape must have exactly 3 dimensions.");
  }
  int totalSize = shape.getTotalSize();

  idx = Math.floorMod(idx, totalSize);

  int dimX = shape.getDimension(0);
  int dimY = shape.getDimension(1);
  int dimZ = shape.getDimension(2);

  int idxZ = idx % dimZ;
  int idxY = (idx / dimZ) % dimY;
  int idxX = idx / (dimY * dimZ);

  return new int[]{idxX, idxY, idxZ};
}

Tensor parseConvBias(String[] bias) {
  int outChNum = bias.length;
  Tensor tensor = new Tensor(new int[]{outChNum}); // Create 1D tensor

  for (int i = 0; i < outChNum; i++) {
    tensor.set(Float.parseFloat(bias[i]), i); // Store each element in Tensor
  }

  return tensor;
}

Tensor parseConvWeightsToTensor(String[] weights) {
  int outChNum = weights.length;
  int inChNum = 0;
  int kernelWNum = 0;
  int kernelHNum = 0;

  // Calculate size of each dimension
  for (int i = 0; i < outChNum; i++) {
    String[] inCh = weights[i].split("!");
    inChNum = inCh.length;
    for (int j = 0; j < inChNum; j++) {
      String[] kernelW = inCh[j].split(",");
      kernelWNum = kernelW.length;
      for (int k = 0; k < kernelWNum; k++) {
        String[] kernelH = kernelW[k].split(" ");
        kernelHNum = kernelH.length;
      }
    }
  }

  // Define Tensor shape and create Tensor object
  int[] shape = {outChNum, inChNum, kernelWNum, kernelHNum};
  Tensor tensor = new Tensor(shape);

  // Store parsed data in Tensor
  for (int i = 0; i < outChNum; i++) {
    String[] inCh = weights[i].split("!");
    for (int j = 0; j < inChNum; j++) {
      String[] kernelW = inCh[j].split(",");
      for (int k = 0; k < kernelWNum; k++) {
        String[] kernelH = kernelW[k].split(" ");
        for (int l = 0; l < kernelHNum; l++) {
          // Set value in Tensor's 1D array
          tensor.set(Float.parseFloat(kernelH[l]), i, j, k, l);
        }
      }
    }
  }
  return tensor;
}

public Tensor parseMLPWeight(String[] weights) {
  int batchNum = weights.length;
  int inChNum = weights[0].split(" ").length;

  Tensor tensor = new Tensor(new int[]{batchNum, inChNum}); // Create 2D Tensor

  for (int i = 0; i < batchNum; i++) {
    String[] inCh = weights[i].split(" ");
    for (int j = 0; j < inCh.length; j++) {
      tensor.set(Float.parseFloat(inCh[j]), i, j); // Set each element in Tensor
    }
  }
  return tensor;
}

public Tensor softmax(Tensor tensor) {
  Shape originalShape = tensor.getShape();
  Tensor flattened = tensor.clone();
  flattened._reshape(flattened.getShape().getTotalSize());

  float maxVal = tensor.max();

  float sumExp = 0;
  for (int i = 0; i < flattened.getShape().get(0); i++) {
    //data[i] = (float) Math.exp(data[i] - maxVal);
    flattened.set((float) Math.exp(flattened.get(i) - maxVal), i);
    sumExp += flattened.get(i);
  }

  for (int i = 0; i < flattened.getShape().get(0); i++) {
    flattened.set(flattened.get(i)/sumExp, i);
  }

  // Return to original shape
  flattened._reshape(originalShape.toArray());
  return flattened;
}

float easeInOutCirc(float x) {
  if (x < 0.5) {
    return (1 - sqrt(1 - pow(2 * x, 2))) / 2;
  } else {
    return (sqrt(1 - pow(-2 * x + 2, 2)) + 1) / 2;
  }
}




void saveCameraState(char num) {
  CameraState state = cam.getState();
  String path = String.format(dataPath("camstate_%c.ser"), num);

  try (FileOutputStream fileOut = new FileOutputStream(path);
  ObjectOutputStream out = new ObjectOutputStream(fileOut)) {

    out.writeObject(state); // Serialize object and save to file
    System.out.println("Object has been successfully saved.");
  }
  catch (IOException e) {
    e.printStackTrace();
  }
}

void loadCameraState(char num) {
  CameraState state = null;
  String path = String.format(dataPath("camstate_%c.ser"), num);

  try (FileInputStream fileIn = new FileInputStream(path);
  ObjectInputStream in = new ObjectInputStream(fileIn)) {

    state = (CameraState) in.readObject(); // Deserialize object
    System.out.println("Object has been successfully loaded.");
    System.out.println("Loaded object: " + state);
  }
  catch (IOException | ClassNotFoundException e) {
    e.printStackTrace();
  }

  if (state != null) {
    cam.setState(state, 200);
  }
}


CameraState loadCameraState(String  path) {
  CameraState state = null;

  try (FileInputStream fileIn = new FileInputStream(dataPath(path));
  ObjectInputStream in = new ObjectInputStream(fileIn)) {

    state = (CameraState) in.readObject();
    System.out.println("Object has been successfully loaded.");
    System.out.println("Loaded object: " + state);
  }
  catch (IOException | ClassNotFoundException e) {
    e.printStackTrace();
  }

  return state;
}

void drawAnswers(TensorVisualizer tv) {
  for (int i = 0; i < tv.boxes.length; i++) {
    if (tv.boxes[i].isVisible) {
      textSize(15);
      text(i, tv.boxes[i].curPos.x, tv.boxes[i].curPos.y + 30, tv.boxes[i].curPos.z);
    }
  }
}
