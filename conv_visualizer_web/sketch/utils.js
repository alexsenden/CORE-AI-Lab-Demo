// Utility functions
function getIndex(shape, ...indices) {
    let index = 0;
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] < 0 || indices[i] >= shape.get(i)) {
            return -1;
        }
        index = index * shape.get(i) + indices[i];
    }
    return index;
}

function index1DTo2D(idx, shape) {
    if (shape.getNumDimensions() !== 2) {
        throw new Error("Shape must have exactly 2 dimensions.");
    }
    const totalSize = shape.getTotalSize();
    idx = ((idx % totalSize) + totalSize) % totalSize;

    const dimX = shape.getDimension(0);
    const dimY = shape.getDimension(1);

    const idxY = idx % dimY;
    const idxX = Math.floor(idx / dimY);

    return [idxX, idxY];
}

function index1DTo3D(idx, shape) {
    if (shape.getNumDimensions() !== 3) {
        throw new Error("Shape must have exactly 3 dimensions.");
    }
    const totalSize = shape.getTotalSize();
    idx = ((idx % totalSize) + totalSize) % totalSize;

    const dimX = shape.getDimension(0);
    const dimY = shape.getDimension(1);
    const dimZ = shape.getDimension(2);

    const idxZ = idx % dimZ;
    const idxY = Math.floor((idx / dimZ) % dimY);
    const idxX = Math.floor(idx / (dimY * dimZ));

    return [idxX, idxY, idxZ];
}

function indicesToSliceIndices(indices, start) {
    return indices.map((idx, i) => idx - start[i]);
}

function parseConvBias(biasData) {
    const outChNum = biasData.length;
    const tensor = new Tensor(outChNum);

    for (let i = 0; i < outChNum; i++) {
        tensor.set(parseFloat(biasData[i]), i);
    }

    return tensor;
}

function parseConvWeightsToTensor(weightsData) {
    const outChNum = weightsData.length;
    let inChNum = 0;
    let kernelWNum = 0;
    let kernelHNum = 0;

    // Calculate size of each dimension
    for (let i = 0; i < outChNum; i++) {
        const inCh = weightsData[i].split("!");
        inChNum = inCh.length;
        for (let j = 0; j < inChNum; j++) {
            const kernelW = inCh[j].split(",");
            kernelWNum = kernelW.length;
            for (let k = 0; k < kernelWNum; k++) {
                const kernelH = kernelW[k].split(" ");
                kernelHNum = kernelH.length;
            }
        }
    }

    // Define Tensor shape and create Tensor object
    const shape = [outChNum, inChNum, kernelWNum, kernelHNum];
    const tensor = new Tensor(...shape);

    // Store parsed data in Tensor
    for (let i = 0; i < outChNum; i++) {
        const inCh = weightsData[i].split("!");
        for (let j = 0; j < inChNum; j++) {
            const kernelW = inCh[j].split(",");
            for (let k = 0; k < kernelWNum; k++) {
                const kernelH = kernelW[k].split(" ");
                for (let l = 0; l < kernelHNum; l++) {
                    tensor.set(parseFloat(kernelH[l]), i, j, k, l);
                }
            }
        }
    }
    return tensor;
}

function parseMLPWeight(weightsData) {
    const batchNum = weightsData.length;
    const inChNum = weightsData[0].split(" ").length;

    const tensor = new Tensor(batchNum, inChNum);

    for (let i = 0; i < batchNum; i++) {
        const inCh = weightsData[i].split(" ");
        for (let j = 0; j < inCh.length; j++) {
            tensor.set(parseFloat(inCh[j]), i, j);
        }
    }
    return tensor;
}

function softmax(tensor) {
    const originalShape = tensor.getShape();
    const flattened = tensor.clone();
    flattened._reshape(flattened.getShape().getTotalSize());

    const maxVal = tensor.max();

    let sumExp = 0;
    for (let i = 0; i < flattened.getShape().get(0); i++) {
        const val = Math.exp(flattened.get(i) - maxVal);
        flattened.set(val, i);
        sumExp += val;
    }

    for (let i = 0; i < flattened.getShape().get(0); i++) {
        flattened.set(flattened.get(i) / sumExp, i);
    }

    // Return to original shape
    flattened._reshape(...originalShape.toArray());
    return flattened;
}

function easeInOutCirc(x) {
    if (x < 0.5) {
        return (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2;
    } else {
        return (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
    }
}
