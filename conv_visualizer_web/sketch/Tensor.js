// Shape class
class Shape {
    constructor(...dimensions) {
        this.dimensions = dimensions;
        this.length = dimensions.length;
    }

    get(index) {
        return this.dimensions[index];
    }

    getDimension(index) {
        return this.dimensions[index];
    }

    getNumDimensions() {
        return this.dimensions.length;
    }

    getTotalSize() {
        return this.dimensions.reduce((a, b) => a * b, 1);
    }

    getDimensions() {
        return this.dimensions.slice();
    }

    toArray() {
        return this.dimensions.slice();
    }

    toString() {
        return '[' + this.dimensions.join(', ') + ']';
    }
}

// Tensor class
class Tensor {
    constructor(...shape) {
        this.shape = new Shape(...shape);
        const totalSize = shape.reduce((a, b) => a * b, 1);
        this.data = new Array(totalSize).fill(0);
    }

    clone() {
        const clonedTensor = new Tensor(...this.shape.toArray());
        clonedTensor.data = this.data.slice();
        return clonedTensor;
    }

    squeeze() {
        const newShape = this.shape.dimensions.filter(dim => dim > 1);
        if (newShape.length === 0) {
            newShape.push(1);
        }

        const squeezedTensor = new Tensor(...newShape);
        squeezedTensor.data = this.data;
        return squeezedTensor;
    }

    _relu() {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] < 0) {
                this.data[i] = 0;
            }
        }
    }

    get(...indices) {
        const index = getIndex(this.shape, ...indices);
        if (index === -1) {
            return 0;
        }
        return this.data[index];
    }

    set(value, ...indices) {
        const index = getIndex(this.shape, ...indices);
        if (index !== -1) {
            this.data[index] = value;
        }
    }

    getShape() {
        return this.shape;
    }

    _reshape(...newShape) {
        const newTotalSize = newShape.reduce((a, b) => a * b, 1);
        const currentTotalSize = this.shape.dimensions.reduce((a, b) => a * b, 1);
        if (newTotalSize !== currentTotalSize) {
            throw new Error("Total number of elements must remain the same");
        }
        this.shape = new Shape(...newShape);
    }

    slice(start, end) {
        if (start.length !== this.shape.length || end.length !== this.shape.length) {
            throw new Error("Start and end indices must match the tensor's shape dimensions");
        }

        const newShape = [];
        for (let i = 0; i < this.shape.length; i++) {
            newShape[i] = end[i] - start[i];
            if (newShape[i] <= 0) {
                throw new Error("Invalid slice range for dimension " + i);
            }
        }

        const slicedTensor = new Tensor(...newShape);
        this.copySliceWithPadding(this, slicedTensor, start, new Array(this.shape.length).fill(0), 0);
        return slicedTensor;
    }

    copySliceWithPadding(original, sliced, start, indices, dim) {
        if (dim === this.shape.length) {
            for (let i = 0; i < this.shape.length; i++) {
                if (indices[i] < start[i] || indices[i] >= this.shape.get(i)) {
                    sliced.set(0, ...indicesToSliceIndices(indices, start));
                    return;
                }
            }
            sliced.set(original.get(...indices), ...indicesToSliceIndices(indices, start));
        } else {
            for (let i = start[dim]; i < start[dim] + sliced.shape.get(dim); i++) {
                indices[dim] = i;
                this.copySliceWithPadding(original, sliced, start, indices, dim + 1);
            }
        }
    }

    toString() {
        return this.toStringRecursive(new Array(this.shape.length).fill(0), 0);
    }

    toStringRecursive(indices, dim) {
        if (dim === this.shape.length - 1) {
            let result = '[';
            for (let i = 0; i < this.shape.get(dim); i++) {
                indices[dim] = i;
                result += this.get(...indices);
                if (i < this.shape.get(dim) - 1) {
                    result += ', ';
                }
            }
            result += ']';
            return result;
        } else {
            let result = '[';
            for (let i = 0; i < this.shape.get(dim); i++) {
                indices[dim] = i;
                result += this.toStringRecursive(indices, dim + 1);
                if (i < this.shape.get(dim) - 1) {
                    result += ',\n ';
                }
            }
            result += ']';
            return result;
        }
    }

    max() {
        if (this.data.length === 0) {
            throw new Error("Tensor is empty");
        }
        let maxVal = this.data[0];
        for (let i = 1; i < this.data.length; i++) {
            if (this.data[i] > maxVal) {
                maxVal = this.data[i];
            }
        }
        return maxVal;
    }
}
