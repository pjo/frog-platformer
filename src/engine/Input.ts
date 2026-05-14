export class InputManager {
  private keys = new Set<string>()

  // Called when touch/mouse controls are used on-screen
  setKey(key: string, down: boolean) {
    down ? this.keys.add(key) : this.keys.delete(key)
  }

  // Handle physical keyboard
  onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    
    const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS']
    if (codes.includes(e.code)) {
      if (e.code === 'Space') e.preventDefault() // Only prevent default for space to allow typing
      this.keys.add(e.code)
    }
  }

  onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  mount() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp)
  }

  unmount() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  clear() { this.keys.clear() }

  get left() { return this.keys.has('ArrowLeft') || this.keys.has('KeyA') }
  get right() { return this.keys.has('ArrowRight') || this.keys.has('KeyD') }
  get jump() { return this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW') }
}
