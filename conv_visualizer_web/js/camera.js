// Orbital camera controller for 3D visualization
class Camera {
    constructor() {
        // Camera distance from center
        this.distance = 2500;

        // Camera rotation (spherical coordinates)
        this.rotationX = 0.2; // Rotation around Y axis (horizontal)
        this.rotationY = 0.3; // Rotation around X axis (vertical)

        // Rotation speed
        this.rotationSpeed = 0.01;
        this.zoomSpeed = 50;
        this.keyboardMoveSpeed = 40; // Speed for keyboard translation

        // Camera translation offset (for keyboard movement)
        this.translation = new Vec3(0, 0, 0);

        // Mouse state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Keyboard state
        this.keys = {};

        // Center point to orbit around
        this.center = new Vec3(0, 0, 0);
    }

    // Get camera's local coordinate axes based on current rotation
    getCameraAxes() {
        // Calculate orbital camera position using spherical coordinates
        const camX = Math.sin(this.rotationX) * Math.cos(this.rotationY) * this.distance;
        const camY = Math.sin(this.rotationY) * this.distance;
        const camZ = Math.cos(this.rotationX) * Math.cos(this.rotationY) * this.distance;

        const orbitalPos = new Vec3(camX, camY, camZ);
        const eye = new Vec3(
            orbitalPos.x + this.translation.x,
            orbitalPos.y + this.translation.y,
            orbitalPos.z + this.translation.z
        );

        const center = new Vec3(
            this.center.x + this.translation.x,
            this.center.y + this.translation.y,
            this.center.z + this.translation.z
        );

        // Forward vector: from camera to center (normalized)
        const forward = new Vec3(
            center.x - eye.x,
            center.y - eye.y,
            center.z - eye.z
        );
        forward.normalize();

        // World up vector (flipped upside-down)
        const worldUp = new Vec3(0, -1, 0);

        // Right vector: cross product of world up and forward
        const right = new Vec3();
        right.cross(worldUp, forward);
        right.normalize();

        // Camera up vector: cross product of forward and right
        const up = new Vec3();
        up.cross(forward, right);
        up.normalize();

        return { forward, right, up };
    }

    // Update camera based on keyboard input (translation relative to camera orientation)
    update() {
        // Get camera's local coordinate axes
        const { forward, right, up } = this.getCameraAxes();

        // Handle horizontal movement (left/right arrow keys) - move along camera's right vector
        if (this.keys['ArrowLeft']) {
            const move = right.copy().mult(this.keyboardMoveSpeed);
            this.translation.add(move);
        }
        if (this.keys['ArrowRight']) {
            const move = right.copy().mult(-this.keyboardMoveSpeed);
            this.translation.add(move);
        }

        // Handle forward/backward movement (up/down arrow keys) - move along camera's forward vector
        if (this.keys['ArrowUp']) {
            const move = forward.copy().mult(this.keyboardMoveSpeed);
            this.translation.add(move);
        }
        if (this.keys['ArrowDown']) {
            const move = forward.copy().mult(-this.keyboardMoveSpeed);
            this.translation.add(move);
        }

        // Handle vertical movement (W/S keys) - move along camera's up vector
        if (this.keys['w'] || this.keys['W']) {
            const move = up.copy().mult(this.keyboardMoveSpeed);
            this.translation.add(move);
        }
        if (this.keys['s'] || this.keys['S']) {
            const move = up.copy().mult(-this.keyboardMoveSpeed);
            this.translation.add(move);
        }
    }

    // Handle mouse press
    handleMouseDown(x, y) {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    // Handle mouse release
    handleMouseUp() {
        this.isDragging = false;
    }

    // Handle mouse drag (rotation)
    handleMouseMove(x, y) {
        if (this.isDragging) {
            const dx = x - this.lastMouseX;
            const dy = y - this.lastMouseY;

            this.rotationX += dx * this.rotationSpeed;
            this.rotationY -= dy * this.rotationSpeed; // Inverted vertical rotation

            // Clamp vertical rotation to prevent flipping
            this.rotationY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationY));

            this.lastMouseX = x;
            this.lastMouseY = y;
        }
    }

    // Handle mouse wheel (zoom)
    handleWheel(delta) {
        this.distance += delta > 0 ? this.zoomSpeed : -this.zoomSpeed;
        this.distance = Math.max(100, Math.min(5000, this.distance));
    }

    // Get view matrix
    getViewMatrix() {
        // Calculate orbital camera position using spherical coordinates
        const camX = Math.sin(this.rotationX) * Math.cos(this.rotationY) * this.distance;
        const camY = Math.sin(this.rotationY) * this.distance;
        const camZ = Math.cos(this.rotationX) * Math.cos(this.rotationY) * this.distance;

        // Add translation offset for keyboard movement
        const orbitalPos = new Vec3(camX, camY, camZ);
        const eye = new Vec3(
            orbitalPos.x + this.translation.x,
            orbitalPos.y + this.translation.y,
            orbitalPos.z + this.translation.z
        );

        // Center point also moves with translation
        const center = new Vec3(
            this.center.x + this.translation.x,
            this.center.y + this.translation.y,
            this.center.z + this.translation.z
        );
        const up = new Vec3(0, -1, 0); // Flipped upside-down

        return WebGLUtils.createLookAt(eye, center, up);
    }

    // Set key state for keyboard controls
    setKey(key, pressed) {
        this.keys[key] = pressed;
    }
}
