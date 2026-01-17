// Simple camera controller to replace PeasyCam
// This is a basic implementation that mimics PeasyCam functionality
class CameraController {
    constructor(sketch, distance) {
        this.sketch = sketch;
        this.distance = distance || 400;
        this.rotationX = 0;
        this.rotationY = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.centerZ = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.sensitivity = 0.01;
    }

    beginHUD() {
        // In p5.js, we don't have beginHUD/endHUD like Processing
        // We'll handle this differently in the main sketch
        push();
    }

    endHUD() {
        pop();
    }

    setState(state, duration) {
        if (state) {
            // Apply camera state if provided
            this.rotationX = state.rotationX || this.rotationX;
            this.rotationY = state.rotationY || this.rotationY;
            this.distance = state.distance || this.distance;
        }
    }

    getState() {
        return {
            rotationX: this.rotationX,
            rotationY: this.rotationY,
            distance: this.distance,
            centerX: this.centerX,
            centerY: this.centerY,
            centerZ: this.centerZ
        };
    }

    apply() {
        // Apply camera transformations
        translate(this.centerX, this.centerY, this.centerZ);
        rotateX(this.rotationY);
        rotateY(this.rotationX);
        translate(0, 0, -this.distance);
    }

    handleMousePressed() {
        this.isDragging = true;
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
    }

    handleMouseReleased() {
        this.isDragging = false;
    }

    handleMouseDragged() {
        if (this.isDragging) {
            const dx = mouseX - this.lastMouseX;
            const dy = mouseY - this.lastMouseY;
            this.rotationX += dx * this.sensitivity;
            this.rotationY += dy * this.sensitivity;
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }

    handleWheel(event) {
        // Zoom with mouse wheel
        const zoomSpeed = 10;
        this.distance += event.delta > 0 ? zoomSpeed : -zoomSpeed;
        this.distance = constrain(this.distance, 50, 2000);
    }
}
