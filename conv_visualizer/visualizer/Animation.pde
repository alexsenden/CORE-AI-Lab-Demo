public abstract class Animation {
  boolean isComplete = true;
  CameraState state;
  protected Animation nextAnimation; // Next animation

  public Animation() {
  }

  public void setState(CameraState state) {
    this.state = state;
  }

  // Method to start animation
  public void start() {
    resetAnimation(); // Reset animation
    startAnimation(); // Perform start logic
    if (state != null) {
      cam.setState(state, 400);
    }
  }

  // Method to reset animation
  public void reset() {
    resetAnimation(); // Implement additional reset logic if needed
  }

  // Reset logic to be implemented by inherited classes
  protected abstract void resetAnimation();

  // Start logic to be implemented by inherited classes
  protected abstract void startAnimation();

  // Animation update method
  public abstract void update();

  // Method to check if animation is complete
  public boolean isComplete() {
    return isComplete;
  }

  // Method to set next animation
  public void setNextAnimation(Animation nextAnimation) {
    this.nextAnimation = nextAnimation;
  }

  public void endAnimation() {
    isComplete = true;
    resetAnimation();
    if (this.nextAnimation != null)
      nextAnimation.start();
  }
}
