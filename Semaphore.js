// ==UserScript==
// @name         Semaphore
// @simple       Synchronously do some shared thing - like downloading items on a list - 5 at the same time. More than that is queued for later when another finishes.
// description   Async counting semaphore functionality, based on Edsger Dijkstra's concept from the '60s, using JS Promises. Taken from StackOverflow and adapted. General workings are a synchronization primitive used to control access to a common resource by multiple threads and avoid critical section problems in a concurrent system.
// @version      0.1.1
// @author       marchage
// @match        *://*
// ==/UserScript==
/* eslint-env greasemonkey */

export default class Semaphore {
    // (ficticious) semaphore #S = #max - #count
    #max
    #count
    #queue

    constructor(max = 1) {
        if (max < 1) { max = 1 }
        this.#max = max
        this.#count = 0
        this.#queue = []
    }

    // P - decrementing semaphore #S by 1 (when #S is negative the caller is blocked i.e. added to semaphore's queue and resolving is posponed).
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

    // V - incrementing semaphore #S by 1 representing an access slot that has become available
    release() {
        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift()
            resolve()
        }
        this.#count--
    }
}