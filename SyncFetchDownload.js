// ==UserScript==
// @name         SyncFetchDownload.js
// @description  Synchronized blob fetching 5 at a time, something with synchronized blob downloading with mutex (Taken from StackOverflow, ...) (synchronicity starts here, by not awaiting async function)
// @version      0.1.0
// @author       marchage
// @match        *://*
// @require      https://raw.githubusercontent.com/marchage/lib-user.js/main/Semaphore.js
// ==/UserScript==
/* eslint-env greasemonkey */
; (function (global) {
    'use strict'

    const semaphore = new Semaphore(5)
    const mutex = new Semaphore(1)
    const delay = 100

    const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms))

    const downloadBlob = (blob, name) => {
        const anchor = document.createElement("a")
        anchor.setAttribute("download", name || "")
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
        setTimeout(_ => URL.revokeObjectURL(blob), 30000)
    }

    const fetchBlob = async (url) => {
        if (url == null) return

        const res = await fetch(url).then(res => { if (!res.ok) throw new Error("Not 2xx response", { cause: res }); else return res })
        const resBuf = await res.arrayBuffer()
        const resBlob = new Blob([resBuf], { type: 'application/octet-stream' })

        return resBlob
    }

    function SyncFetchDownload() {
        return {

            fetchBlobSynchronized: async function (url) {
                await semaphore.acquire()
                const blob = await fetchBlob(url)
                semaphore.release()
                return blob
            },

            downloadBlobSynchronized: async function (blob, name) {
                await mutex.acquire()
                downloadBlob(blob, name)
                await sleep(delay)
                mutex.release()
                console.info("Downloaded", name)
            }

        }
    }

    if (typeof exports === 'object') {
        // node export
        module.exports = SyncFetchDownload
    } else if (typeof define === 'function' && define.amd) {
        // amd export
        define(function () {
            return SyncFetchDownload
        })
    } else {
        // browser global
        global.SyncFetchDownload = SyncFetchDownload
    }
}(this))
