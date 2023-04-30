// ==UserScript==
// @name         Synchroon
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...)
// @version      0.2.2
// @modifiedby   marchage
// @match        *://*
// ==/UserScript==
/* eslint-env greasemonkey */

// import {
//   Semaphore,
// } from 'https:/raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore';
let Semaphore
(async () => {
    ({ default: Semaphore } = await import('https:/raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore'))
})();

class Synchroon {
    static #semaphore = new Semaphore(5)
    static #mutex = new Semaphore(1)

    static #downloadBlob(blob, name) {
        const anchor = document.createElement("a")
        anchor.setAttribute("download", name || "")
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
        setTimeout(_ => URL.revokeObjectURL(blob), 30000)
    }

    static async #fetchBlob(url) {
        // if (url == null) return
        const res = await fetch(url).then(res => { if (!res.ok) throw new Error("Not 2xx response", { cause: res }); else return res })
        const resBuf = await res.arrayBuffer()
        const blob = new Blob([resBuf], { type: 'application/octet-stream' })
        return blob
    }

    // (synchronicity starts below, by not awaiting these async function)

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
        await new Promise(resolve => setTimeout(resolve, 100))
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
