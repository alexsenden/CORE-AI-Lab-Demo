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
        // Camera state handling can be added here if needed
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

    update(currentTime) {
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
