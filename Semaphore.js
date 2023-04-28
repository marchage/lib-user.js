// ==UserScript==
// @name         Semaphore
// @description  Async Semaphore implementation for your GreaseMonkey/userscripts, based on Promises. (Taken from StackOverflow, ...)
// @version      0.1.0
// @author       marchage
// @match        *://*
// ==/UserScript==
/* eslint-env greasemonkey */
class Semaphore {
    constructor(max = 1) {
        if (max < 1) { max = 1 }
        this.max = max
        this.count = 0
        this.queue = []
    }
    acquire() {
        let promise
        if (this.count < this.max) {
            promise = Promise.resolve()
        } else {
            promise = new Promise(resolve => {
                this.queue.push(resolve)
            })
        }
        this.count++
        return promise
    }
    release() {
        if (this.queue.length > 0) {
            const resolve = this.queue.shift()
            resolve()
        }
        this.count--
    }
}