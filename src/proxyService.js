const axios = require('axios');
let proxy = {};
let proxyToken = process.env.WEBSHARE_API_KEY;
async function getProxyForLocation(country, city) {
    const url = new URL('https://proxy.webshare.io/api/v2/proxy/list/');
    url.searchParams.append('mode', 'direct');
    url.searchParams.append('page', '1');
    url.searchParams.append('page_size', '25');
    url.searchParams.append('country_code__in', 'US');
    // console.log("proxyToken", proxyToken)
    try {
        const response = await axios.get(url.href, {
            headers: {
                Authorization: `Token ${String(proxyToken)}`
            }
        });

        // console.log("DATA:>>>>", response.data.results)
        if (response.data.results && response.data.results.length > 0) {
            const filteredResults = response.data.results.filter(proxy => proxy.city_name === city);

            if (filteredResults.length > 0) {
                const randomIndex = Math.floor(Math.random() * filteredResults.length);
                proxy = filteredResults[randomIndex];
            } else {
                const randomIndex = Math.floor(Math.random() * response.data.results.length);
                proxy = response.data.results[randomIndex];
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
