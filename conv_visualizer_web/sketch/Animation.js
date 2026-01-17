class Animation {
    constructor() {
        this.isComplete = true;
        this.state = null;
        this.nextAnimation = null;
    }

    setState(state) {
        this.state = state;
    }

    start() {
        this.resetAnimation();
        this.startAnimation();
        if (this.state && cam) {
            cam.setState(this.state, 400);
        }
    }

    reset() {
        this.resetAnimation();
    }

    resetAnimation() {
        // To be implemented by subclasses
    }

    startAnimation() {
        // To be implemented by subclasses
    }

    update() {
        // To be implemented by subclasses
    }

    isAnimationComplete() {
        return this.isComplete;
    }

    setNextAnimation(nextAnimation) {
        this.nextAnimation = nextAnimation;
    }

    endAnimation() {
        this.isComplete = true;
        this.resetAnimation();
        if (this.nextAnimation !== null) {
            this.nextAnimation.start();
        }
    }
}
