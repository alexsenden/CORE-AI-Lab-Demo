class Box {
    constructor(indices, tensor, startPos, endPos, startSize, endSize) {
        this.indices = indices;
        this.tensor = tensor;
        this.orgPos = startPos.copy();
        this.curPos = startPos.copy();
        this.trgPos = endPos.copy();
        this.orgSize = startSize.copy();
        this.curSize = startSize.copy();
        this.trgSize = endSize.copy();
        this.orgVal = createVector(0, 0, 0);
        this.curVal = createVector(0, 0, 0);

        this.isVisible = false;
        this.damping = 0.2;
        this.eps = 5.0;
        this.trgBox = null;

        this.frameStart = frameCount;
        this.frameDuration = 50;
    }

    copy() {
        const copiedBox = new Box(
            [...this.indices],
            this.tensor,
            this.orgPos.copy(),
            this.trgPos.copy(),
            this.orgSize.copy(),
            this.trgSize.copy()
        );

        copiedBox.curPos = this.curPos.copy();
        copiedBox.curSize = this.curSize.copy();
        copiedBox.orgVal = this.orgVal.copy();
        copiedBox.curVal = this.curVal.copy();
        copiedBox.isVisible = this.isVisible;
        copiedBox.damping = this.damping;
        copiedBox.eps = this.eps;
        copiedBox.frameStart = this.frameStart;
        copiedBox.frameDuration = this.frameDuration;
        copiedBox.trgBox = this.trgBox ? this.trgBox.copy() : null;

        return copiedBox;
    }

    getOrgPos() {
        return this.orgPos;
    }

    setOrgPos(pos) {
        this.orgPos = pos.copy();
    }

    getCurPos() {
        return this.curPos;
    }

    setCurPos(pos) {
        this.curPos = pos.copy();
    }

    getTrgPos() {
        return this.trgPos;
    }

    setTrgPos(pos) {
        this.trgPos = pos.copy();
    }

    getOrgSize() {
        return this.orgSize;
    }

    setOrgSize(size) {
        this.orgSize = size.copy();
    }

    getCurSize() {
        return this.curSize;
    }

    setCurSize(size) {
        this.curSize = size.copy();
    }

    getTrgSize() {
        return this.trgSize;
    }

    setTrgSize(size) {
        this.trgSize = size.copy();
    }

    setTrgBox(box) {
        this.trgBox = box;
    }

    setCurVal(val) {
        this.curVal.set(val, val, val);
    }

    getVal() {
        return this.tensor.get(...this.indices);
    }

    setAnimationDuration(duration) {
        this.frameDuration = duration;
    }

    update() {
        const elapsed = frameCount - this.frameStart;
        const progress = constrain(elapsed / this.frameDuration, 0, 1);
        const easing = easeInOutCirc(progress);

        this.curPos = p5.Vector.lerp(this.orgPos, this.trgPos, easing);
        this.curSize = p5.Vector.lerp(this.orgSize, this.trgSize, easing);

        let val;
        if (this.trgBox !== null) {
            val = this.trgBox.getVal();
        } else {
            val = this.getVal();
        }

        const targetVal = createVector(val, val, val);
        const valDiff = p5.Vector.sub(targetVal, this.curVal);
        valDiff.mult(this.damping);
        this.curVal.add(valDiff);
    }

    setVisible(visibility) {
        this.isVisible = visibility;
    }

    isCloseEnough() {
        const isClose = this.curPos.dist(this.trgPos) < this.eps;
        if (isClose && this.trgBox !== null) {
            this.trgBox.setVisible(true);
        }
        return isClose;
    }

    draw() {
        if (this.isVisible) {
            push();
            translate(this.curPos.x, this.curPos.y, this.curPos.z);
            strokeWeight(0.5);
            stroke(255);
            fill(this.curVal.x * 255, this.curVal.y * 255, this.curVal.z * 255);
            box(this.curSize.x, this.curSize.y, this.curSize.z);
            pop();
        }
    }
}
