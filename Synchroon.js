// ==UserScript==
// @name         Synchroon
// @description  Async number semaphore guarded synchronized binary downloading - 5 at a time. Semaphore Taken from SO and adapted.
//               Synchronicity starts here, by not awaiting public async functions, but rather awaiting the private ones.
// @version      0.4.5
// @author       marchage
// @match        *://*
// @grant        GM_xmlhttpRequest
// @grant        window.location
// ==/UserScript==

class Lib {
    /**
     * absolute URL from relative URL
     *
     * @static
     * @param {string} url URL to make (or keep) absolue
     * @returns Absolute URL
     */
    static absUrl (url) {
        const a = new URL(url, window.location.href)
        // (if not works, look into replacing comma in name)
        return `${a.protocol}//${a.hostname}${a.pathname}${a.search}${a.hash}`
    }

    /**
     * Filename from URL, max 20 chars, no comma's
     *
     * @static
     * @param {string} url URL to to take the last 20 chars of pathname from
     * @returns Name for the file (max 20 chars)(without comma's)
     */
    static nameFromUrl (url = window.location.href) {
        const a = new URL(url, window.location.href)
        let res = `${a.pathname.split('/').pop().slice(-20)}`
        if (res.length === 0) {
            // eslint-disable-next-line no-debugger
            debugger
            res = `nameless-medium-${a.hostname}`
        }
        res = res.replace(/,/g, '')
        if (res.split('.').length < 2) res = `${res}.jpg`
        return res
    }

    static getElementsByContains (
        str,
        elmtTagName = '*',
        node = document
    ) {
        const elms = document.evaluate(
            `//${elmtTagName}[contains(., "${str}")]`,
            node,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        )
        const nodeSet = []
        for (let i = 0; i < elms.snapshotLength; i++)
            nodeSet.push(elms.snapshotItem(i))
        return nodeSet
    }

    static getElementsByXPath = (xpath) => {
        const result = []
        const nodesSnapshot = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        )
        for (let i = 0; i < nodesSnapshot.snapshotLength; i++)
            result.push(nodesSnapshot.snapshotItem(i))

        return result
    }

    static parseQuery (s) { return [...new URLSearchParams(s).entries()].reduce((acc, [k, v]) => { acc[k] = v; return acc }, {}) }

    // @TODO better names (if possible)
    static _extends () {
        return Object.assign || function (target) {
            for (let i = 1; i < arguments.length; i++) {
                const source = arguments[i]
                for (const key in source)
                    if (Object.prototype.hasOwnProperty.call(source, key))
                        target[key] = source[key]
            }
            return target
        }
    }

    static _oNoProps (obj, keys) {
        const target = {}
        for (const i in obj) {
            if (keys.includes(i) || !Object.prototype.hasOwnProperty.call(obj, i)) continue
            target[i] = obj[i]
        }
        return target
    }

    static xPathRm (xPRm) { Lib.xpath(xPRm).forEach(d => { d.parentNode.removeChild(d) }) }

    static addCssToDocument (css) {
        const style = document.createElement('style')
        style.innerText = css
        document.head.appendChild(style)
    }

    static arrRandEl (a) { return (Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a) }
}

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
    constructor (max = 1) {
        if (max < 1) max = 1
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
    acquire () {
        let promise
        if (this.#count < this.#max) promise = Promise.resolve()
        else
            promise = new Promise((resolve) => {
                this.#queue.push(resolve)
            })

        this.#count += 1
        return promise
    }

    /**
     * Commen in literature V-function, incrementing semaphore #S by 1, representing
     * an access slot of total max concurrent that has become available. If there
     * are any waiting in the queue, the first one is resolved.
     */
    release () {
        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift()
            resolve()
        }
        this.#count -= 1
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
    static #semaphore = new Semaphore(5)
    /** @type {Semaphore} semaphore of 1, behavous like a simple mutex-lock */
    static #mutex = new Semaphore(1)
    /** @type {number} Don't know why this was, but it was needed for some reason. Hopefully not only demonstration purpouses?! */
    static #delay = 100

    static #sleep (ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Download blob with name to local disk. If no name is given, the browser name is taken from blob type.
     *
     * @static
     * @param {*} blob
     * @param {*} name
     */
    static #downloadBlob (blob, name) {
        const anchor = document.createElement('a')
        anchor.setAttribute('download', name || '')
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
        setTimeout((_) => URL.revokeObjectURL(blob), 30_000)
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
    static #makeGetRequest (url, responseType = 'blob', headers = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType,
                headers,
                onload(response) {
                    resolve(response)
                },
                onerror(error) {
                    reject(error)
                }
            })
        })
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
    static async #fetchBlob (url) {
        // if (url == null) return
        // const res = await fetch(url).then(res => {
        const res = await Synchroon.#makeGetRequest(url).then(
            (res) => {
                // fetch's res had ok property, but GM_xmlhttpRequest's res doesn't
                if (res.status !== 200)
                    throw new Error(
                        '#FETCHBLOB SUCCEDED, BUT got notified of a not 2xx response',
                        { cause: res }
                    )
                else return res
            },
            (err) => {
                throw new Error(
                    '#FETCHBLOB FAILED! Promise rejected w/ error, so a real one',
                    { cause: err }
                )
            }
        )
        const blob = res.response
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
    static async downloadBlobSynced (blob, name) {
        await Synchroon.#mutex.acquire()
        Synchroon.#downloadBlob(blob, name)
        await Synchroon.#sleep(Synchroon.#delay)
        Synchroon.#mutex.release()

        console.info('Downloaded', name)
    }

    /**
     * Semaphore controlled synchronous fetching of blob from URL. Can be called
     * from async function without awaiting. Allows 5 concurrent fetches at a time.
     *
     * @static
     * @async
     * @param {*} URL to fetch in the form of a blob
     * @returns {unknown}
     * @throws {Error} if the fetch fails or the response is not 2xx
     */
    static async fetchBlobSynced (url) {
        await Synchroon.#semaphore.acquire()
        let blob
        try {
            blob = await Synchroon.#fetchBlob(url)
            Synchroon.#semaphore.release()
        } catch (e) {
            Synchroon.#semaphore.release()
            throw new Error('Fetching blob failed', { exception: e })
        }
        return blob
    }
}
