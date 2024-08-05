const axios = require('axios');
let proxy = {};
let proxyToken = process.env.WEBSHARE_API_KEY;
async function getProxyForLocation(country, city) {
    const url = new URL('https://proxy.webshare.io/api/v2/proxy/list/');
    url.searchParams.append('mode', 'direct'); // mode = backbone for 7$ plan
    url.searchParams.append('page', '1');
    url.searchParams.append('page_size', '25');
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
