export class InputManager {
  private keys = new Set<string>()
  private blocked = new Set<string>()

  // Called when touch/mouse controls are used on-screen
  setKey(key: string, down: boolean) {
    down ? this.keys.add(key) : this.keys.delete(key)
  }

  // Snapshot currently held keys as blocked; they are ignored until released.
  // Call this when the game starts so keys held during the start screen
  // (e.g. held while typing name/email) don't immediately move the frog.
  blockCurrentKeys() {
    this.blocked = new Set(this.keys)
  }

  // Handle physical keyboard
  onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

    const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS']
    if (codes.includes(e.code)) {
      if (e.code === 'Space') e.preventDefault()
      this.keys.add(e.code)
    }
  }

  onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
    this.blocked.delete(e.code) // unblock once the key is physically released
  }

  mount() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp)
  }

  unmount() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  clear() { this.keys.clear(); this.blocked.clear() }

  get left()  { return (this.keys.has('ArrowLeft')  && !this.blocked.has('ArrowLeft'))  || (this.keys.has('KeyA') && !this.blocked.has('KeyA')) }
  get right() { return (this.keys.has('ArrowRight') && !this.blocked.has('ArrowRight')) || (this.keys.has('KeyD') && !this.blocked.has('KeyD')) }
  get jump()  { return (this.keys.has('Space')      && !this.blocked.has('Space'))      || (this.keys.has('ArrowUp') && !this.blocked.has('ArrowUp')) || (this.keys.has('KeyW') && !this.blocked.has('KeyW')) }
}
