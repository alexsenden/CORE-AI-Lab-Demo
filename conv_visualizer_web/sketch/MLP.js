class MLP {
    constructor(weightsPath, biasPath, relu, weightsData, biasData) {
        this.weights = parseMLPWeight(weightsData);
        this.bias = parseConvBias(biasData);
        this.wShape = [this.weights.getShape().get(0), this.weights.getShape().get(1)];
        this.relu = relu;
    }

    matMul(matrix1, matrix2) {
        const m1Rows = matrix1.getShape().get(0);
        const m1Cols = matrix1.getShape().get(1);
        const m2Cols = matrix2.getShape().get(1);

        // Check if the matrices can be multiplied
        if (m1Cols !== matrix2.getShape().get(0)) {
            throw new Error("Invalid matrix dimensions");
        }

        const result = new Tensor(m1Rows, m2Cols);

        for (let i = 0; i < m1Rows; i++) {
            for (let j = 0; j < m2Cols; j++) {
                let sum = 0.0;
                for (let k = 0; k < m1Cols; k++) {
                    sum += matrix1.get(i, k) * matrix2.get(k, j);
                }
                result.set(sum, i, j);
            }
            const currentVal = result.get(i, 0);
            result.set(currentVal + this.bias.get(i), i, 0);

            if (this.relu) {
                result._relu();
            }
        }

        return result;
    }

    forward(x) {
        return this.matMul(this.weights, x);
    }
}
