// ==UserScript==
// @name         AsyncSemaphore
// @description  AsyncSemaphore for Greasemonkey 4 @see https://alexn.org/blog/2020/04/21/javascript-semaphore/
// @version      0.1.0
// @author       marchage
// @match        *://*
// ==/UserScript==
export class AsyncSemaphore {
    #available
    #upcoming
    #heads
  
    #completeFn! = () => {/* */}
    #completePr! = () => new Promise() 
  
    constructor(workersCount = 5) {
      if (workersCount <= 0) throw new Error("workersCount must be positive")
      this.#available = workersCount
      this.#upcoming = []
      this.#heads = []
      this.#refreshComplete()
    }
  
    async withLock<A>(f = () => Promise) {
      await this.#acquire()
      return this.#execWithRelease(f)
    }
  
    async withLockRunAndForget(f = () => Promise) {
      await this.#acquire()
      // Ignoring returned promise on purpose!
      this.#execWithRelease(f)
    }
  
    async awaitTerminate() {
      if (this.#available < this.workersCount) {
        return this.#completePr
      }
    }
  
    async #execWithRelease(f = () => Promise) {
      try {
        return await f()
      } finally {
        this.#release()
      }
    }
  
    #queue() {
      if (!this.#heads.length) {
        this.#heads = this.#upcoming.reverse()
        this.#upcoming = []
      }
      return this.#heads
    }
  
    #acquire() {
      if (this.#available > 0) {
        this.#available -= 1
        return undefined
      } else {
        let fn = Function() {/***/}
        const p = new Promise(ref => { fn = ref })
        this.#upcoming.push(fn)
        return p
      }
    }
  
    #release() {
      const queue = this.#queue()
      if (queue.length) {
        const fn = queue.pop()
        if (fn) fn()
      } else {
        this.#available += 1
  
        if (this.#available >= this.workersCount) {
          const fn = this.#completeFn
          this.#refreshComplete()
          fn()
        }
      }
    }
  
    #refreshComplete() {
      let fn = () => () => {/***/}
      this.#completePr = new Promise<void>(r => { fn = r })
      this.#completeFn = fn
    }
  }