import java.util.Arrays;

class Shape {
  int[] dimensions;
  int length;

  Shape(int... dimensions) {
    this.dimensions = dimensions;
    this.length = dimensions.length;
  }

  int get(int index) {
    return dimensions[index];
  }

  int getDimension(int index) {
    return dimensions[index];
  }

  int getNumDimensions() {
    return dimensions.length;
  }

  int getTotalSize() {
    return Arrays.stream(dimensions).reduce(1, (a, b) -> a * b);
  }

  int[] getDimensions() {
    return dimensions;
  }

  int[] toArray() {
    return dimensions.clone(); // Return cloned array
  }

  @Override
    String toString() {
    return Arrays.toString(dimensions);
  }
}

class Tensor {

  float[] data;
  Shape shape;

  // Constructor
  Tensor(int... shape) {
    this.shape = new Shape(shape);
    this.data = new float[Arrays.stream(shape).reduce(1, (a, b) -> a * b)];
  }

  Tensor clone() {
    // Create new tensor using same shape
    Tensor clonedTensor = new Tensor(shape.toArray());

    // Copy original data array values to new tensor data array
    System.arraycopy(this.data, 0, clonedTensor.data, 0, this.data.length);

    return clonedTensor;
  }

  // Add squeeze method
  public Tensor squeeze() {
    // Create new shape excluding dimensions with size 1
    int[] newShape = Arrays.stream(shape.getDimensions())
      .filter(dim -> dim > 1) // Exclude dimensions with size 1
      .toArray();

    // Maintain at least 1 dimension if all dimensions have size 1
    if (newShape.length == 0) {
      newShape = new int[]{1};
    }

    // Create Tensor object using new shape
    Tensor squeezedTensor = new Tensor(newShape);

    //System.arraycopy(this.data, 0, squeezedTensor.data, 0, this.data.length);
    squeezedTensor.data = this.data;
    return squeezedTensor;
  }

  void _relu() {
    for (int i = 0; i < data.length; i++) {
      if (data[i] < 0) {
        data[i] = 0;
      }
    }
  }


  float get(int... indices) {
    int index = getIndex(this.shape, indices);
    if (index == -1) {
      return 0; // Return 0 for padding area
    }
    return data[index];
  }

  void set(float value, int... indices) {
    int index = getIndex(this.shape, indices);
    if (index != -1) {
      data[index] = value; // Set value only for valid indices
    }
  }

  // Return shape (dimension information)
  Shape getShape() {
    return shape;
  }

  void _reshape(int... newShape) {
    int newTotalSize = Arrays.stream(newShape).reduce(1, (a, b) -> a * b);
    int currentTotalSize = Arrays.stream(shape.toArray()).reduce(1, (a, b) -> a * b);
    if (newTotalSize != currentTotalSize) {
      throw new IllegalArgumentException("Total number of elements must remain the same");
    }
    this.shape = new Shape(newShape);
  }

  Tensor slice(int[] start, int[] end) {
    if (start.length != shape.length || end.length != shape.length) {
      throw new IllegalArgumentException("Start and end indices must match the tensor's shape dimensions");
    }

    // Calculate size of each dimension and define new shape
    int[] newShape = new int[shape.length];
    for (int i = 0; i < shape.length; i++) {
      newShape[i] = end[i] - start[i];
      if (newShape[i] <= 0) {
        throw new IllegalArgumentException("Invalid slice range for dimension " + i);
      }
    }

    Tensor slicedTensor = new Tensor(newShape);

    copySliceWithPadding(this, slicedTensor, start, new int[shape.length], 0);

    return slicedTensor;
  }

  // Recursively slice and copy data, apply zero padding if out of bounds
  void copySliceWithPadding(Tensor original, Tensor sliced, int[] start, int[] indices, int dim) {
    if (dim == shape.length) {
      // Apply zero padding for out of bounds indices
      for (int i = 0; i < shape.length; i++) {
        if (indices[i] < start[i] || indices[i] >= shape.get(i)) {
          sliced.set(0, indicesToSliceIndices(indices, start));
          return;
        }
      }
      // Copy original value for indices within range
      sliced.set(original.get(indices), indicesToSliceIndices(indices, start));
    } else {
      for (int i = start[dim]; i < start[dim] + sliced.shape.get(dim); i++) {
        indices[dim] = i;
        copySliceWithPadding(original, sliced, start, indices, dim + 1);
      }
    }
  }

  // Convert original indices to slice indices
  int[] indicesToSliceIndices(int[] indices, int[] start) {
    int[] sliceIndices = new int[indices.length];
    for (int i = 0; i < indices.length; i++) {
      sliceIndices[i] = indices[i] - start[i];
    }
    return sliceIndices;
  }


  @Override
    String toString() {
    return toStringRecursive(new int[shape.length], 0);
  }

  // Recursively traverse each dimension and convert to string
  String toStringRecursive(int[] indices, int dim) {
    if (dim == shape.length - 1) {  // Innermost dimension case
      StringBuilder sb = new StringBuilder();
      sb.append("[");
      for (int i = 0; i < shape.get(dim); i++) {
        indices[dim] = i;
        sb.append(get(indices));
        if (i < shape.get(dim) - 1) {
          sb.append(", ");
        }
      }
      sb.append("]");
      return sb.toString();
    } else {  // Upper dimension case
      StringBuilder sb = new StringBuilder();
      sb.append("[");
      for (int i = 0; i < shape.get(dim); i++) {
        indices[dim] = i;
        sb.append(toStringRecursive(indices, dim + 1));
        if (i < shape.get(dim) - 1) {
          sb.append(",\n ");
        }
      }
      sb.append("]");
      return sb.toString();
    }
  }

  float max() {
    if (data.length == 0) {
      throw new IllegalStateException("Tensor is empty");
    }

    float maxVal = data[0];
    for (int i = 1; i < data.length; i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
      }
    }
    return maxVal;
  }
}
