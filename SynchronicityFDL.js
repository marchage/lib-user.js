// ==UserScript==
// @name         SynchronicityFDL
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...) (synchronicity starts here, by not awaiting async function)
// @version      0.1.1
// @author       marchage
// @match        *://*
// @require      https://raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js
// ==/UserScript==
/* eslint-env greasemonkey */
class SynchronicityFDL {
    #semaphore
    #mutex
    #delay

    constructor(concurrency = 5) {
        this.#semaphore = new Semaphore(concurrency)
        this.#mutex = new Semaphore(1)
        this.#delay = 100
    }

    #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    #downloadBlob(blob, name) {
        const anchor = document.createElement("a")
        anchor.setAttribute("download", name || "")
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
        setTimeout(_ => URL.revokeObjectURL(blob), 30000)
    }

    async #fetchBlob(url) {
        if (url == null) return

        const res = await fetch(url).then(res => { if (!res.ok) throw new Error("Not 2xx response", { cause: res }); else return res })
        const resBuf = await res.arrayBuffer()
        const resBlob = new Blob([resBuf], { type: 'application/octet-stream' })

        return resBlob
    }
    
    async fetchBlobSynced (url) {
        await this.#semaphore.acquire()
        const blob = await this.#fetchBlob(url)
        this.#semaphore.release()
        return blob
    }

    async downloadBlobSynced (blob, name) {
        await this.#mutex.acquire()
        this.#downloadBlob(blob, name)
        await this.#sleep(this.#delay)
        this.#mutex.release()
        console.info("Downloaded", name)
    }
}
