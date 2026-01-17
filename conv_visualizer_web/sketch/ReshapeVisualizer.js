class ReshapeVisualizer extends Animation {
    constructor(srcVis, trgVis) {
        super();
        this.srcVis = srcVis;
        this.trgVis = trgVis;
        this.tv = this.srcVis.copy();
    }

    startAnimation() {
        this.isComplete = false;
        this.tv.setCurVal(this.srcVis);
        this.tv.setTrgSize(mlpBoxSize);
        this.tv.setAnimationDuration(100);
        this.tv.setTrgPos(this.trgVis);
        this.tv.setVisible(true);
    }

    resetAnimation() {
        this.isComplete = true;
    }

    update() {
        if (!this.isComplete) {
            this.tv.update();
            if (this.tv.isAnimationComplete()) {
                this.trgVis.setVisible(true);
                this.resetAnimation();
                this.endAnimation();
            }
        }
    }

    draw() {
        if (!this.isComplete) {
            this.tv.draw();
        }
    }
}
