// ==UserScript==
// @name         Synchroon
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...) (synchronicity starts here, by not awaiting async function)
// @version      0.2.0
// @author       marchage
// @match        *://*
// @require      https://raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js
// ==/UserScript==
/* eslint-env greasemonkey */
import { Semaphore } from 'https://raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js'

export class Synchroon {
    static #semaphore = new Semaphore(5)
    static #mutex = new Semaphore(1)
    static #delay = 100

    static #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

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

    static async downloadBlobSynced(blob, name) {
        await Synchroon.#mutex.acquire()
        Synchroon.#downloadBlob(blob, name)
        await Synchroon.#sleep(Synchroon.#delay)
        Synchroon.#mutex.release()
        console.info("Downloaded", name)
    }

    static async fetchBlobSynced(url) {
        await Synchroon.#semaphore.acquire()
        const blob = await Synchroon.#fetchBlob(url)
        Synchroon.#semaphore.release()
        return blob
    }
}
