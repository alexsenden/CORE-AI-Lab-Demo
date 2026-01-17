class TensorVisualizer {
    constructor(tensor, centerPos, spacing, boxSize, boxStartSize = null) {
        this.tensor = tensor.squeeze();
        this.centerPos = centerPos.copy();
        this.spacing = spacing;
        this.boxSize = boxSize.copy();
        this.boxStartSize = boxStartSize ? boxStartSize.copy() : null;

        if (this.tensor.getShape().getNumDimensions() > 3) {
            throw new Error("Tensor must have 3 or fewer dimensions");
        }

        this.boxes = [];
        this.animationStage = 0;
        this.idxFlatSrc = 0;
        this.idxFlatTrg = 0;

        const indices = new Array(this.tensor.getShape().getNumDimensions()).fill(0);
        this.createBoxes(indices, 0, this.boxSize);
    }

    setIdxFlat(idxFlatSrc, idxFlatTrg) {
        this.idxFlatSrc = idxFlatSrc;
        this.idxFlatTrg = idxFlatTrg;
    }

    createBoxes(indices, dim, boxSize) {
        if (dim === this.tensor.getShape().getNumDimensions()) {
            const pos = createVector(0, 0, 0);
            const boxIndex = getIndex(this.tensor.shape, ...indices);

            if (this.tensor.getShape().getNumDimensions() === 3) {
                const halfX = this.tensor.getShape().get(1) / 2;
                const halfY = this.tensor.getShape().get(2) / 2;
                const halfZ = this.tensor.getShape().get(0) / 2;
                const x = map(indices[1], 0, this.tensor.getShape().get(1) - 1, -halfX * this.spacing, halfX * this.spacing);
                const y = map(indices[2], 0, this.tensor.getShape().get(2) - 1, -halfY * this.spacing, halfY * this.spacing);
                const z = map(indices[0], 0, this.tensor.getShape().get(0) - 1, -halfZ * this.spacing, halfZ * this.spacing);
                pos.set(y, x, z);
            } else if (this.tensor.getShape().getNumDimensions() === 2) {
                const halfX = (this.tensor.getShape().get(0) - 1) / 2;
                const halfY = (this.tensor.getShape().get(1) - 1) / 2;
                const x = map(indices[0], 0, this.tensor.getShape().get(0) - 1, -halfX * this.spacing, halfX * this.spacing);
                const y = map(indices[1], 0, this.tensor.getShape().get(1) - 1, -halfY * this.spacing, halfY * this.spacing);
                pos.set(y, x, 0);
            } else {
                const halfX = (this.tensor.getShape().get(0) - 1) / 2;
                const x = map(indices[0], 0, this.tensor.getShape().get(0) - 1, -halfX * this.spacing, halfX * this.spacing);
                pos.set(x, 0, 0);
            }

            pos.add(this.centerPos);

            const startSize = this.boxStartSize || boxSize;
            this.boxes[boxIndex] = new Box(
                [...indices],
                this.tensor,
                pos.copy(),
                pos.copy(),
                startSize,
                boxSize
            );
            return;
        }

        for (let i = 0; i < this.tensor.getShape().get(dim); i++) {
            indices[dim] = i;
            this.createBoxes(indices, dim + 1, boxSize);
        }
    }

    setTensor(tensor) {
        if (tensor.getShape().getTotalSize() !== this.tensor.getShape().getTotalSize()) {
            throw new Error("Shape of the new tensor must match the shape of the visualizer tensor");
        }
        const squeezed = tensor.squeeze();
        this.tensor.shape = squeezed.shape;
        this.tensor.data = squeezed.data;
    }

    setTrgPos(tv) {
        if (tv.tensor.data.length !== this.tensor.data.length) {
            throw new Error("Shape of the new tensor must match the shape of the visualizer tensor");
        }
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].frameStart = frameCount;
            this.boxes[i].setTrgPos(tv.boxes[i].getTrgPos());
        }
    }

    setCurSize(size) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].setCurSize(size);
        }
    }

    setTrgSize(size) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].setTrgSize(size);
        }
    }

    setCurVal(tv) {
        if (tv.tensor.data.length !== this.tensor.data.length) {
            throw new Error("Shape of the new tensor must match the shape of the visualizer tensor");
        }
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].setCurVal(tv.boxes[i].getVal());
        }
    }

    setTrgPos(box) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].frameStart = frameCount;
            this.boxes[i].setOrgSize(this.boxes[i].getTrgSize());
            this.boxes[i].setOrgPos(this.boxes[i].getTrgPos());
            this.boxes[i].setTrgPos(box.getTrgPos());
            this.boxes[i].setTrgBox(box);
        }
    }

    setCurPosOffset(offset) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].curPos.add(offset);
        }
    }

    setAnimationDuration(duration) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].setAnimationDuration(duration);
        }
    }

    setTrgPosOffset(offset) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].trgPos.add(offset);
        }
    }

    setVisible(visibility) {
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxes[i].setVisible(visibility);
        }
    }

    getAnimationStage() {
        return this.animationStage;
    }

    setAnimationStage(stage) {
        this.animationStage = stage;
    }

    isAnimationComplete() {
        for (let box of this.boxes) {
            if (!box.isCloseEnough()) {
                return false;
            }
        }
        return true;
    }

    update() {
        for (let box of this.boxes) {
            box.update();
        }
    }

    draw() {
        // Draw all boxes (simplified version without instancing for now)
        for (let box of this.boxes) {
            box.draw();
        }
    }

    copy() {
        const copy = new TensorVisualizer(this.tensor, this.centerPos, this.spacing, this.boxSize, this.boxStartSize);
        copy.animationStage = this.animationStage;
        copy.idxFlatSrc = this.idxFlatSrc;
        copy.idxFlatTrg = this.idxFlatTrg;

        for (let i = 0; i < this.boxes.length; i++) {
            copy.boxes[i] = this.boxes[i].copy();
        }

        return copy;
    }

    disposeBuffers() {
        // No-op in simplified version (would clean up VBOs in OpenGL version)
    }
}
