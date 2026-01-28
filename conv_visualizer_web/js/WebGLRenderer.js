// WebGL Renderer for boxes
class WebGLRenderer {
    // Toggle for white edges (lines between faces)
    static ENABLE_EDGES = true;
    static PLASMA_COLOR_MAP = false;

    // Plasma colormap: maps value [0,1] to RGB [0,1]
    static plasmaColorMap(value) {
        // Handle invalid values
        if (value === undefined || value === null || isNaN(value)) {
            value = 0;
        }

        // Clamp value to [0, 1]
        value = Math.max(0, Math.min(1, value));

        // Key colors in Plasma colormap (approximated)
        let colors
        if (WebGLRenderer.PLASMA_COLOR_MAP) {
            colors = [
                [0.050383, 0.029803, 0.527975],  // 0.0: dark purple
                [0.363536, 0.017502, 0.550349],  // 0.25: purple
                [0.988362, 0.0, 0.644924],       // 0.5: magenta/pink
                [0.940015, 0.5, 0.131326],       // 0.75: orange
                [0.940015, 0.975158, 0.131326]   // 1.0: yellow
            ];
        } else {
            colors = [
                [0.0, 0.0, 0.0],  // 0.0: black
                [1.0, 1.0, 1.0],  // 1.0: white
            ];
        }

        // Handle edge case: value is exactly 1.0
        if (value >= 1.0) {
            const lastColor = colors[colors.length - 1];
            return { r: lastColor[0], g: lastColor[1], b: lastColor[2] };
        }

        // Find which segment we're in
        const segment = value * 4; // 0-4
        const index = Math.floor(segment);
        const t = segment - index;

        // Ensure indices are valid
        const i1 = Math.min(index, colors.length - 1);
        const i2 = Math.min(index + 1, colors.length - 1);

        // Safety check
        if (i1 < 0 || i1 >= colors.length || i2 < 0 || i2 >= colors.length) {
            // Fallback to first color
            return { r: colors[0][0], g: colors[0][1], b: colors[0][2] };
        }

        // Interpolate between colors
        const r = colors[i1][0] + (colors[i2][0] - colors[i1][0]) * t;
        const g = colors[i1][1] + (colors[i2][1] - colors[i1][1]) * t;
        const b = colors[i1][2] + (colors[i2][2] - colors[i1][2]) * t;

        return { r, g, b };
    }

    constructor(gl) {
        this.gl = gl;
        this.program = null;

        // Box geometry (unit cube)
        this.boxVertices = new Float32Array([
            // Front face
            -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
            // Back face
            -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
            // Top face
            -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
            // Bottom face
            -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
            // Right face
            0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
            // Left face
            -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
        ]);

        this.boxIndices = new Uint16Array([
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,   // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23,   // left
        ]);

        // Edge indices for drawing white edges (12 unique edges of a cube, each edge has 2 vertices)
        // Using vertices from front/back faces and connecting edges
        // Front face: 0(-0.5,-0.5,0.5), 1(0.5,-0.5,0.5), 2(0.5,0.5,0.5), 3(-0.5,0.5,0.5)
        // Back face: 4(-0.5,-0.5,-0.5), 5(-0.5,0.5,-0.5), 6(0.5,0.5,-0.5), 7(0.5,-0.5,-0.5)
        this.edgeIndices = new Uint16Array([
            // Front face edges
            0, 1,   // front bottom
            1, 2,   // front right
            2, 3,   // front top
            3, 0,   // front left
            // Back face edges
            4, 7,   // back bottom
            7, 6,   // back right
            6, 5,   // back top
            5, 4,   // back left
            // Connecting edges (front to back)
            0, 4,   // bottom left
            1, 7,   // bottom right
            2, 6,   // top right
            3, 5    // top left
        ]);

        this.init();
    }

    init() {
        const vertexShaderSource = `
            attribute vec3 a_position;
            attribute vec3 a_color;
            
            uniform mat4 u_mvpMatrix;
            uniform mat4 u_modelMatrix;
            
            varying vec3 v_color;
            
            void main() {
                gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
                v_color = a_color;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 v_color;
            
            void main() {
                gl_FragColor = vec4(v_color, 1.0);
            }
        `;

        const vertexShader = WebGLUtils.createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = WebGLUtils.createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            return;
        }

        this.program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);

        if (!this.program) {
            return;
        }

        // Create buffers
        this.positionBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();
        this.edgeIndexBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();

        // Upload box geometry
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.boxVertices, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.boxIndices, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.edgeIndices, this.gl.STATIC_DRAW);

        // Cache attribute/uniform locations (don't query every frame)
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
        this.mvpMatrixLocation = this.gl.getUniformLocation(this.program, 'u_mvpMatrix');

        // Pre-allocate reusable color array (24 vertices * 3 components = 72 floats)
        this.reusableColorArray = new Float32Array(72);
        this.reusableEdgeColorArray = new Float32Array(72);
        // Pre-fill edge color array (white, doesn't change)
        for (let i = 0; i < 24; i++) {
            this.reusableEdgeColorArray[i * 3 + 0] = 1.0;
            this.reusableEdgeColorArray[i * 3 + 1] = 1.0;
            this.reusableEdgeColorArray[i * 3 + 2] = 1.0;
        }
    }

    renderBoxes(boxes, mvpMatrix) {
        if (!this.program || boxes.length === 0) {
            return;
        }

        this.gl.useProgram(this.program);

        // Bind index buffer once (it's shared across all boxes)
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Set up position attribute once (it's the same for all boxes)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        const numVertices = 24;

        // Render edges first (if enabled), then main boxes
        if (WebGLRenderer.ENABLE_EDGES) {
            // Set line width for edges (may not be supported on all systems, but try anyway)
            this.gl.lineWidth(5);

            // Bind edge color buffer (white)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.reusableEdgeColorArray, this.gl.DYNAMIC_DRAW);
            this.gl.enableVertexAttribArray(this.colorLocation);
            this.gl.vertexAttribPointer(this.colorLocation, 3, this.gl.FLOAT, false, 0, 0);

            // Bind edge index buffer
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);

            // Render all edges
            for (let box of boxes) {
                if (!box.isVisible) continue;

                const scaleMatrix = WebGLUtils.createScale(box.curSize.x, box.curSize.y, box.curSize.z);
                const translateMatrix = WebGLUtils.createTranslation(box.curPos.x, box.curPos.y, box.curPos.z);
                const modelMatrix = WebGLUtils.multiplyMatrices(translateMatrix, scaleMatrix);
                const boxMvpMatrix = WebGLUtils.multiplyMatrices(mvpMatrix, modelMatrix);

                this.gl.uniformMatrix4fv(this.mvpMatrixLocation, false, boxMvpMatrix);
                // Draw edges as lines
                this.gl.drawElements(this.gl.LINES, this.edgeIndices.length, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        // Render main boxes
        // Bind face index buffer (for triangles)
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Bind color buffer (will be updated per box)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.enableVertexAttribArray(this.colorLocation);
        this.gl.vertexAttribPointer(this.colorLocation, 3, this.gl.FLOAT, false, 0, 0);

        for (let box of boxes) {
            if (!box.isVisible) continue;

            // Create model matrix (scale and translate)
            const scaleMatrix = WebGLUtils.createScale(box.curSize.x, box.curSize.y, box.curSize.z);
            const translateMatrix = WebGLUtils.createTranslation(box.curPos.x, box.curPos.y, box.curPos.z);
            const modelMatrix = WebGLUtils.multiplyMatrices(translateMatrix, scaleMatrix);
            const boxMvpMatrix = WebGLUtils.multiplyMatrices(mvpMatrix, modelMatrix);

            this.gl.uniformMatrix4fv(this.mvpMatrixLocation, false, boxMvpMatrix);

            // Get value from box and calculate color
            let value = 0;
            if (box.curVal && typeof box.curVal.x === 'number' && !isNaN(box.curVal.x)) {
                value = Math.max(0, Math.min(1, box.curVal.x));
            }

            // Map value to Plasma colormap
            const plasmaColor = WebGLRenderer.plasmaColorMap(value);
            const r = plasmaColor.r;
            const g = plasmaColor.g;
            const b = plasmaColor.b;

            // Reuse pre-allocated array instead of creating new one
            for (let i = 0; i < numVertices; i++) {
                this.reusableColorArray[i * 3 + 0] = r;
                this.reusableColorArray[i * 3 + 1] = g;
                this.reusableColorArray[i * 3 + 2] = b;
            }

            // Upload color data
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.reusableColorArray, this.gl.DYNAMIC_DRAW);

            // Draw main box
            this.gl.drawElements(this.gl.TRIANGLES, this.boxIndices.length, this.gl.UNSIGNED_SHORT, 0);
        }
    }
}
