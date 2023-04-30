// ==UserScript==
// @name         Synchroon
// @description  Async number semaphore guarded synchronized binary downloading - 5 at a time. Taken from StackOverflow 
//               first, and later https://alexn.org/blog/2020/04/21/javascript-semaphore/. Synchronicity starts 
//               here, by not awaiting public async functions, but rather awaiting the private ones (as this script does).
// @version      0.2.1
// @author       marchage
// @match        *://*
// ==/UserScript==
/* eslint-env greasemonkey */

class AsyncSemaphore {
    #available
    #upcoming
    #heads

    #completeFn! = () => {/* */ }
    #completePr! = () => new Promise()

    
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
     * Acquire a lock and execute the given function. The lock is not released 
     * when the function returns, but rather some time in the future.
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
     * @date 4/30/2023 - 11:20:51 AM
     * @author marchage
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


/**
 * Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...)
 * @date 4/30/2023 - 11:22:51 AM
 * @author marchage
 *
 * @class Synchroon
 * @typedef {Synchroon}
 */
class Synchroon {
    /** @type {AsyncSemaphore} */
    static #semaphore = new AsyncSemaphore(5)
    /** @type {AsyncSemaphore} semaphore of 1, behavous like a simple mutex-lock */
    static #mutex = new AsyncSemaphore(1)
    /** @type {number} Don't know why this was, but it was needed for some reason. Hopefully not only demonstration purpouses?! */
    static #delay = 100

    static #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }


    /**
     * Download blob with name to local disk. If no name is given, the browser name is taken from blob type.
     *
     * @static
     * @param {*} blob
     * @param {*} name
     */
    static #downloadBlob(blob, name) {
        const anchor = document.createElement("a")
        anchor.setAttribute("download", name || "")
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
        setTimeout(_ => URL.revokeObjectURL(blob), 30000)
    }

    /**
     * Private function to fetch a blob from a URL. If the response is not 2xx
     * an error is thrown.
     *
     * @static
     * @async
     * @param {*} url
     * @returns {unknown}
     */
    static async #fetchBlob(url) {
        // if (url == null) return
        const res = await fetch(url).then(res => { if (!res.ok) throw new Error("Not 2xx response", { cause: res }); else return res })
        const resBuf = await res.arrayBuffer()
        const blob = new Blob([resBuf], { type: 'application/octet-stream' })
        return blob
    }

    /**
     * Mutex protected blob downloading. Can be called from async function without
     * awaiting. Allows only 1 download at a time because otherwise the browser 
     * would ingtermingle the downloads?
     *
     * @static
     * @async
     * @param {*} blob Blob to download
     * @param {*} name Name of the file to download
     * @returns {*}
     */
    static async downloadBlobSynced(blob, name) {
        await Synchroon.#mutex.acquire()
        Synchroon.#downloadBlob(blob, name)
        await Synchroon.#sleep(Synchroon.#delay)
        Synchroon.#mutex.release()
        console.info("Downloaded", name)
    }

    /**
     * Semaphore controlled synchronous fetching of blob from URL. Can be called
     * from async function without awaiting. Allows 5 concurrent fetches at a time.
     *
     * @static
     * @async
     * @param {*} URL to fetch in the form of a blob
     * @returns {unknown}
     */
    static async fetchBlobSynced(url) {
        await Synchroon.#semaphore.acquire()
        const blob = await Synchroon.#fetchBlob(url)
        Synchroon.#semaphore.release()
        return blob
    }
}
