class Button {
  float x, y, w, h;
  String text;
  color defaultColor, hoverColor, clickColor;
  boolean isHovered = false;
  boolean isClicked = false;
  Runnable action;

  // Constructor
  Button(float x, float y, float w, float h, String text, Runnable action) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
    this.action = action;

    defaultColor = color(200);  // Default color (gray)
    hoverColor = color(150);    // Hover color (darker gray)
    clickColor = color(100);    // Click color (even darker gray)
  }

  // Draw button
  void display() {
    // Check if mouse is over button
    isHovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;

    // Set color
    if (isClicked) {
      fill(clickColor);
    } else if (isHovered) {
      fill(hoverColor);
    } else {
      fill(defaultColor);
    }

    // Draw button
    noStroke();
    rect(x, y, w, h);

    // Draw text
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(50);
    text(text, x + w / 2, y + h / 2);
  }

  // Check click
  void checkClick() {
    if (isHovered && mousePressed) {
      isClicked = true;
      action.run();  // Execute assigned function
    }
  }

  // Reset to original state after click ends
  void resetClick() {
    isClicked = false;
  }
}
