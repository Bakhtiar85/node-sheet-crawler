const fs = require('fs');
const axios = require('axios');
const isProxyPlanFree = process.env.IS_PROXY_PLAN_FREE === "true";
let proxyToken = process.env.WEBSHARE_API_KEY;
let readProxiesFromFile = true;
let staticProxyData = null;
let jsonProxyData = null;
let matchedEntry = null;
let proxy = {};
let proxyMode = null;
async function getProxyForLocation(country, state, city) {
    if (readProxiesFromFile) {
        try {
            if (!staticProxyData) {
                // Read the JSON file
                jsonProxyData = fs.readFileSync('./misc/ips.json', 'utf8');
            }
            staticProxyData = JSON.parse(jsonProxyData);

            const firstCityLetter = city[0].toUpperCase();

            // Extract the specific block for the city
            let cityBlock = staticProxyData[firstCityLetter];

            if (cityBlock) {
                // Find the entry with matching city_name
                matchedEntry = cityBlock.find(entry => {
                    if (entry && entry.city_name && typeof entry.city_name === 'string') {
                        return entry.city_name.toLowerCase() === city.toLowerCase();
                    }
                    return false;
                });
            }

            if (!matchedEntry) {
                const firstStateLetter = state[0].toUpperCase();

                // Extract the specific block for the state
                let stateBlock = staticProxyData[firstStateLetter];

                if (stateBlock) {
                    // Find the entry with matching state
                    matchedEntry = stateBlock.find(entry => {
                        if (entry && entry.city_name && typeof entry.city_name === 'string') {
                            return entry.city_name.toLowerCase() === state.toLowerCase();
                        }
                        return false;
                    });
                }
            }

            if (matchedEntry) {
                matchedEntry.password = "q8jvoil91b2g";
                console.log(state, city, " ::MATCHED_ENTRY: ", matchedEntry)
                return matchedEntry;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error reading or parsing the JSON file:', error);
            return null;
        }
    }
    if (isProxyPlanFree) {
        proxyMode = "direct"; // with 10 free proxies
    } else {
        proxyMode = "backbone"; // with 7$ plan
    }

    const url = new URL('https://proxy.webshare.io/api/v2/proxy/list/');
    url.searchParams.append('mode', proxyMode); // mode = backbone for 7$ plan
    url.searchParams.append('page', '1');
    url.searchParams.append('page_size', '125');
    url.searchParams.append('country_code__in', 'US');
    // console.log("proxyToken", proxyToken)
    try {
        const req = await fetch(url.href, {
            method: "GET",
            headers: {
                Authorization: `Token ${String(proxyToken)}`
            }
        });

        const response = await req.json()

        // console.log("DATA:>>>>", response.results)
        if (response.results && response.results.length > 0) {
            const filteredResults = response.results.filter(proxy => proxy.city_name === city);

            if (filteredResults.length > 0) {
                const randomIndex = Math.floor(Math.random() * filteredResults.length);
                proxy = filteredResults[randomIndex];
            } else {
                const randomIndex = Math.floor(Math.random() * response.results.length);
                proxy = response.results[randomIndex];
            }
            // console.log("SKJL:>>>>>>>>", proxy)
            return {
                server: proxy.proxy_address,
                port: proxy.port,
                username: proxy.username,
                password: proxy.password
            };
        } else {
            throw new Error('No proxies found for the specified location');
        }
    } catch (error) {
        console.error('Error fetching proxy:', error);
        return null;
    }
}

module.exports = { getProxyForLocation };
// getProxyForLocation()
