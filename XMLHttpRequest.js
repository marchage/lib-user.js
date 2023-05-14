// @see https://stackoverflow.com/questions/629671/how-can-i-intercept-xmlhttprequests-from-a-greasemonkey-script
let interceptors = []

/*
 * Add a interceptor.
 */
export const addInterceptor = (interceptor) => {
    interceptors.push(interceptor)
}

/*
 * Clear interceptors
 */
export const clearInterceptors = () => {
    interceptors = []
}

/*
 * XML HTPP requests can be intercepted with interceptors.
 * Takes a regex to match against requests made and a callback to process the response.
 */
const createXmlHttpOverride = (
    open
) => {
    return function (
        method,
        url,
        async,
        username,
        password
    ) {
        this.addEventListener(
            'readystatechange',
            function () {
                if (this.readyState === 4)
                // Override `onreadystatechange` handler, there's no where else this can go.
                // Basically replace the client's with our override for interception.
                    this.onreadystatechange = (function (
                        originalOnreadystatechange
                    ) {
                        return function (ev) {
                            // Only intercept JSON requests.
                            const contentType = this.getResponseHeader('content-type')
                            if (!contentType || !contentType.includes('application/json'))
                                return (
                                    originalOnreadystatechange &&
                  originalOnreadystatechange.call(this, ev)
                                );

                            // Read data from response.
                            (async function () {
                                let success = false
                                let data
                                try {
                                    data =
                    this.responseType === 'blob'
                        ? JSON.parse(await this.response.text())
                        : JSON.parse(this.responseText)
                                    success = true
                                } catch (e) {
                                    console.error('Unable to parse response.')
                                }
                                if (!success)
                                    return (
                                        originalOnreadystatechange &&
                    originalOnreadystatechange.call(this, ev)
                                    )

                                for (const i in interceptors) {
                                    const { regex, override, callback } = interceptors[i]

                                    // Override.
                                    const match = regex.exec(url)
                                    if (match)
                                        if (override)
                                            try {
                                                data = await callback(data)
                                            } catch (e) {
                                                console.error(`Interceptor '${regex}' failed. ${e}`)
                                            }
                                }

                                // Override the response text.
                                Object.defineProperty(this, 'responseText', {
                                    get () {
                                        return JSON.stringify(data)
                                    }
                                })

                                // Tell the client callback that we're done.
                                return (
                                    originalOnreadystatechange &&
                  originalOnreadystatechange.call(this, ev)
                                )
                            }.call(this))
                        }
                    })(this.onreadystatechange)
            },
            false
        )

        open.call(this, method, url, async, username, password)
    }
}

const main = () => {
    const urlRegex = /providers/ // Match any url with "providers" in the url.

    addInterceptor({
        urlRegex,
        callback: async (_data) => {
            // Replace response data.
            return JSON.parse({ hello: 'world' })
        },
        override: true
    })

    XMLHttpRequest.prototype.open = createXmlHttpOverride(
        XMLHttpRequest.prototype.open
    )
}

main()
