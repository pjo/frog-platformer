export class InputManager {
  private keys = new Set<string>()    // active game keys (not from INPUT fields)
  private held = new Set<string>()    // ALL physically held keys, including inside INPUT fields
  private blocked = new Set<string>() // keys to ignore until physically released

  setKey(key: string, down: boolean) {
    down ? this.keys.add(key) : this.keys.delete(key)
  }

  // Snapshot ALL currently held physical keys as blocked.
  // This catches keys held inside <input> fields that never entered `keys`.
  blockCurrentKeys() {
    this.blocked = new Set([...this.held, ...this.keys])
  }

  onKeyDown = (e: KeyboardEvent) => {
    const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS']
    if (codes.includes(e.code)) this.held.add(e.code) // track physical state regardless of target

    const target = e.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

    if (codes.includes(e.code)) {
      if (e.code === 'Space') e.preventDefault()
      this.keys.add(e.code)
    }
  }

  onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code)
    this.keys.delete(e.code)
    this.blocked.delete(e.code)
  }

  onBlur = () => { this.keys.clear(); this.held.clear(); this.blocked.clear() }

  mount() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  unmount() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  clear() { this.keys.clear(); this.held.clear(); this.blocked.clear() }

  get left()  { return (this.keys.has('ArrowLeft')  && !this.blocked.has('ArrowLeft'))  || (this.keys.has('KeyA') && !this.blocked.has('KeyA')) }
  get right() { return (this.keys.has('ArrowRight') && !this.blocked.has('ArrowRight')) || (this.keys.has('KeyD') && !this.blocked.has('KeyD')) }
  get jump()  { return (this.keys.has('Space')      && !this.blocked.has('Space'))      || (this.keys.has('ArrowUp') && !this.blocked.has('ArrowUp')) || (this.keys.has('KeyW') && !this.blocked.has('KeyW')) }
}
