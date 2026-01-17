class Button {
    constructor(x, y, w, h, text, action) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
        this.action = action;

        this.defaultColor = [200, 200, 200];
        this.hoverColor = [150, 150, 150];
        this.clickColor = [100, 100, 100];
        this.isHovered = false;
        this.isClicked = false;
    }

    checkHover() {
        this.isHovered = mouseX > this.x && mouseX < this.x + this.w &&
            mouseY > this.y && mouseY < this.y + this.h;
    }

    display() {
        // Check if mouse is over button
        this.checkHover();

        // Set color
        if (this.isClicked) {
            fill(this.clickColor[0], this.clickColor[1], this.clickColor[2]);
        } else if (this.isHovered) {
            fill(this.hoverColor[0], this.hoverColor[1], this.hoverColor[2]);
        } else {
            fill(this.defaultColor[0], this.defaultColor[1], this.defaultColor[2]);
        }

        // Draw button
        noStroke();
        rect(this.x, this.y, this.w, this.h);

        // Draw text - font should be set globally in setup
        // Note: In WebGL mode, font must be loaded via loadFont() in preload()
        fill(0);
        textAlign(CENTER, CENTER);
        textSize(50);
        text(this.text, this.x + this.w / 2, this.y + this.h / 2);
    }

    checkClick() {
        this.checkHover();
        if (this.isHovered && mouseIsPressed) {
            this.isClicked = true;
            this.action();
        }
    }

    resetClick() {
        this.isClicked = false;
    }
}
