// ==UserScript==
// @name         AsyncSemaphore
// @description  AsyncSemaphore for Greasemonkey 4 @see https://alexn.org/blog/2020/04/21/javascript-semaphore/
// @version      0.1.0
// @author       marchage
// @match        *://*
// ==/UserScript==

class AsyncSemaphore {
    #available
    #upcoming
    #heads

    #completeFn = () => {/* */ }
    #completePr = () => new Promise()


    /**
     * Creates an instance of AsyncSemaphore.
     *
     * @constructor
     * @param {number} [workersCount=5] Number of workers to allow to run at the same time.
     */
    constructor(workersCount = 5) {
        if (workersCount <= 0) throw new Error("workersCount must be positive")
        this.#available = workersCount
        this.#upcoming = []
        this.#heads = []
        this.#refreshComplete()
    }

    // Private API
    async #execWithRelease(f = async () => Promise) {
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
            let fn = new Function('() => {}')
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
        let fn = () => () => {/***/ }
        this.#completePr = new Promise(r => { fn = r })
        this.#completeFn = fn
    }

    // Public API
    /**
     * Acquire a lock and execute the given function. The lock is released when 
     * the function returns.
     *
     * @async
     * @param {() => any} [f=() => Promise]
     * @returns {any) => unknown}
     */
    async withLock(f = () => Promise) {
        await this.#acquire()
        return this.#execWithRelease(f)
    }


    /**
     * Acquire a lock and execute the given function. Only waits in case the 
     * semaphore doesn’t have handles available. And when the loop is finished, 
     * we need awaitTerminate to wait for all active tasks to finish.
     *
     * @async
     * @param {() => any} [f=() => Promise]
     * @returns {any) => any}
     */
    async withLockRunAndForget(f = () => Promise) {
        await this.#acquire()
        // Ignoring returned promise on purpose!
        this.#execWithRelease(f)
    }


    /**
     * Wait for all locks to be released.
     *
     * @async
     * @returns {unknown}
     */
    async awaitTerminate() {
        if (this.#available < this.workersCount) {
            return this.#completePr
        }
    }
}