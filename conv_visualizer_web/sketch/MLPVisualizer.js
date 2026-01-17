class MLPVisualizer extends Animation {
    constructor(mlp, srcVis, trgVis) {
        super();
        this.weights = mlp.weights;
        this.srcVis = srcVis;
        this.trgVis = trgVis;
        this.weightsNum = this.weights.getShape().get(0);
        this.weightsVisualizerList = [];
        this.iterations = 1;
        this.trgIdx = 0;
        this.doCreateFilters = false;
    }

    startAnimation() {
        this.isComplete = false;
        this.doCreateFilters = true;
    }

    resetAnimation() {
        this.isComplete = true;
        this.doCreateFilters = false;
        this.trgIdx = 0;
        this.weightsVisualizerList = [];
    }

    update() {
        if (!this.isComplete) {
            if (frameCount % 5 === 0) {
                for (let iter = 0; iter < this.iterations; iter++) {
                    if (this.doCreateFilters) {
                        const weightSlice = this.weights.slice(
                            [this.trgIdx, 0],
                            [this.trgIdx + 1, this.weights.getShape().get(1)]
                        );
                        const centerPos = this.srcVis.centerPos.copy();
                        const tv = new TensorVisualizer(weightSlice, centerPos, this.srcVis.spacing, createVector(0, 0, 0), mlpBoxSize);
                        tv.setAnimationDuration(70);
                        tv.setCurPosOffset(createVector(0, -50, 0));
                        tv.setTrgPos(this.srcVis);
                        tv.setVisible(true);
                        tv.setIdxFlat(this.trgIdx, this.trgIdx);
                        this.weightsVisualizerList.push(tv);
                    }
                }

                this.trgIdx++;
                if (this.trgIdx >= this.trgVis.tensor.getShape().get(0)) {
                    this.trgIdx = 0;
                    this.doCreateFilters = false;
                }
            }

            if (!this.doCreateFilters && this.weightsVisualizerList.length === 0) {
                this.endAnimation();
            }

            for (let i = this.weightsVisualizerList.length - 1; i >= 0; i--) {
                const tvTemp = this.weightsVisualizerList[i];
                tvTemp.update();
                if (tvTemp.isAnimationComplete()) {
                    if (tvTemp.getAnimationStage() < 1) {
                        tvTemp.setAnimationDuration(70);
                        tvTemp.setTrgPos(this.trgVis.boxes[tvTemp.idxFlatTrg]);
                        tvTemp.setAnimationStage(tvTemp.getAnimationStage() + 1);
                    } else if (tvTemp.getAnimationStage() < 2) {
                        tvTemp.disposeBuffers();
                        this.weightsVisualizerList.splice(i, 1);
                    }
                }
            }
        }
    }

    draw() {
        for (let tv of this.weightsVisualizerList) {
            tv.draw();
        }
    }
}
