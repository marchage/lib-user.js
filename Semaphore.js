// ==UserScript==
// @name         Semaphore
// @simple       Synchronously do some shared thing - like downloading items on a list - 5 at the same time. More than that is queued for later when another finishes.
// description   Async counting semaphore functionality, based on Edsger Dijkstra's concept from the '60s, using JS Promises. Taken from StackOverflow and adapted. General workings are a synchronization primitive used to control access to a common resource by multiple threads and avoid critical section problems in a concurrent system.
// @version      0.1.1
// @author       marchage
// @match        *://*
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
     * @date 4/30/2023 - 2:42:38 AM
     * @author marchage
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
     * @date 4/30/2023 - 2:46:47 AM
     * @author marchage
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
     * @date 4/30/2023 - 2:47:41 AM
     * @author marchage
     */
    release() {
        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift()
            resolve()
        }
        this.#count--
    }
}