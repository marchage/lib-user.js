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

import {
  Semaphore,
} from 'https:/raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js';

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
