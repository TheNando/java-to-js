class UserInput {
  constructor() {
    this.k = {}
    this.mouseEvent = null
    this.isTriggerPressed = false
  }

  setTriggerPressed(isTriggerPressed) {
    this.isTriggerPressed = isTriggerPressed
  }

  handleKeyboardInput(movement) {
    // Move the player according to keyboard state.
    if (this.k[KeyEvent.VK_A]) movement.x -= 1
    if (this.k[KeyEvent.VK_D]) movement.x += 1
    if (this.k[KeyEvent.VK_W]) movement.y -= 1
    if (this.k[KeyEvent.VK_S]) movement.y += 1
  }

  isReloadPressed() {
    return this.k[KeyEvent.VK_R]
  }

  setIsPressed(keyCode, isPressed) {
    this.k[keyCode] = isPressed
  }
}

export default UserInput
