// ==UserScript==
// @name         Synchroon
// @description  Async number semaphore guarded synchronized binary downloading - 5 at a time. Semaphore Taken from SO and adapted.
//               Synchronicity starts here, by not awaiting public async functions, but rather awaiting the private ones.
// @version      0.3.0
// @author       marchage
// @match        *://*
// @grant        GM_xmlhttpRequest
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
 * Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...)
 *
 * @class Synchroon
 * @typedef {Synchroon}
 */
class Synchroon {
    /** @type {Semaphore} */
    static #semaphore = new Semaphore(6)
    /** @type {Semaphore} semaphore of 1, behavous like a simple mutex-lock */
    static #mutex = new Semaphore(1)
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
     * Private function to make a async GET request via GreaseMonkey's 
     * GM_xmlhttpRequest to a URL (use // @ include iso // @match, for cors).
     * @see https://stackoverflow.com/questions/65543898/how-can-i-use-async-gm-xmlhttprequest-to-return-values-in-original-order
     * 
     * @param {string} url url to make a GET request to
     * @param {object} headers headers to add to the request
     * @returns {Promise<string>}
     */
    static #makeGetRequest(url, headers = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function (response) {
                    resolve(response);
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
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
    static async #fetchBlob(url, headers = {}) {
        // if (url == null) return
        const res = await fetch(url, headers).then(res => {
        // const res = await Synchroon.#makeGetRequest(url, headers).then(res => {
            if (!res.ok || res.status !== 200) {
                console.warn(`fetch res not okay!`);
                throw new Error("Not 2xx response", { cause: res });
            } else return res
        }, (err) => {
            console.warn(`rejected fetch, not okay!`);
            throw new Error("Fetch failed (rejected)", { cause: err });
        })
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
    static async fetchBlobSynced(url, header) {
        await Synchroon.#semaphore.acquire()
        let blob
        try {
            blob = await Synchroon.#fetchBlob(url, header)
            Synchroon.#semaphore.release()
        } catch (e) {
            Synchroon.#semaphore.release()
            throw new Error("Fetching blob failed", { exception: e });
        }
        return blob
    }
}
