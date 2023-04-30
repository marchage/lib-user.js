// ==UserScript==
// @name         Synchroon
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...)
//               (synchronicity starts here, by not awaiting async function)
// @version      0.2
// @date         4/30/2023 - 2:17:22 AM
// @modified     4/30/2023 - 2:17:22 AM
// @created      4/30/2023 - 2:17:22 AM
// @modifiedby   marchage
// @match        *://*
// ==/UserScript==
/* eslint-env greasemonkey */

/**
 * Async counting semaphore functionality, based on Edsger Dijkstra's concept from 
 * the '60s, using JS Promises. Taken from StackOverflow and adapted. General workings 
 * are a synchronization primitive used to control access to a common resource by 
 * multiple threads and avoid critical section problems in a concurrent system.
 * 
 * @simple Synchronously do some shared thing - like downloading items on a 
 *         list - 5 at the same time. More than that is queued for later when 
 *         another finishes.
 * @date 4/30/2023 - 2:17:22 AM
 *
 * @class Semaphore
 * @typedef {Semaphore}
 */
class Semaphore {
    /** (ficticious) semaphore #S = #max - #count */
    /** @type {number} */
    #max
    /** @type {number} */
    #count
    /** @type {Array<Function>} */
    #queue
    
    /**
     * Creates an instance of an async counting semaphore for concurrency management.
     * @date 4/30/2023 - 2:42:38 AM
     * @author marchage
     *
     * @constructor
     * @param {number} [max=1] - Maximum number of concurrent operations
     */
    constructor(max = 1) {
        if (max < 1) { max = 1 }
        this.#max = max
        this.#count = 0
        this.#queue = []
    }
    
    /**
     * Commen in literature P-function, decrementing semaphore #S by 1. When #S 
     * is negative the caller is blocked i.e. added to semaphore's queue and 
     * resolving is posponed.
     * @date 4/30/2023 - 2:46:47 AM
     * @author marchage
     *
     * @returns {*}
     */
    acquire() {
        let promise
        if (this.#count < this.#max) {
            promise = Promise.resolve()
        } else {
            promise = new Promise(resolve => {
                this.#queue.push(resolve)
            })
        }
        this.#count++
        return promise
    }

    
    /**
     * Commen in literature V-function, incrementing semaphore #S by 1, representing 
     * an access slot of total max concurrent that has become available. If there
     * are any waiting in the queue, the first one is resolved.
     * @date 4/30/2023 - 2:47:41 AM
     * @author marchage
     */
    release() {
        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift()
            resolve()
        }
        this.#count--
    }
}


/**
 * Synchronized blob fetching 5 at a time, something with synchronized blob 
 * downloading with mutex (Taken from StackOverflow, ...) (synchronicity starts 
 * here, by not awaiting async function)
 * 
 * @date 4/30/2023 - 2:21:24 AM
 * @author marchage
 *
 * @class Synchroon
 * @typedef {Synchroon}
 */
class Synchroon {
    /** @type {Semaphore} */
    static #semaphore = new Semaphore(5)
    /** @type {Semaphore} semaphore of 1, behavous like a simple mutex-lock */
    static #mutex = new Semaphore(1)
    /** @type {number} Don't know why this was, but it was needed for some reason. Hopefully not only demonstration purpouses?! */
    static #delay = 100

    static #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    
    /**
     * Download blob with name to local disk. If no name is given, the browser name is taken from blob type.
     * @date 4/30/2023 - 3:08:31 AM
     * @author marchage
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
     * @date 4/30/2023 - 3:07:37 AM
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
     * @date 4/30/2023 - 3:01:25 AM
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
     * @date 4/30/2023 - 3:02:10 AM
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
