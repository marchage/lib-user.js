// ==UserScript==
// @name         SynchronicityFDL.js
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...) (synchronicity starts here, by not awaiting async function)
// @version      0.1.0
// @author       marchage
// @match        *://*
// @require      https://raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js
// ==/UserScript==
/* eslint-env greasemonkey */
class SyncFetchDownload {
    #semaphore = new Semaphore(5)
    #mutex = new Semaphore(1)
    #delay = 100

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
    
    async fetchBlobSynchronized (url) {
        await semaphore.acquire()
        const blob = await fetchBlob(url)
        semaphore.release()
        return blob
    }

    async downloadBlobSynchronized (blob, name) {
        await mutex.acquire()
        downloadBlob(blob, name)
        await sleep(delay)
        mutex.release()
        console.info("Downloaded", name)
    }
}
