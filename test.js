// const fetch = require('node-fetch');
const fs = require('fs');

const proxyToken = "apikey";
const baseUrl = 'https://proxy.webshare.io/api/v2/proxy/list/';
let page = 1;
let allProxies = [];

const filterProxy = (proxy) => {
    const { password, proxy_address, country_code, asn_name, asn_number, created_at, valid, high_country_confidence, ...filteredProxy } = proxy;
    return filteredProxy;
};

const fetchProxies = async () => {
    try {
        while (true) {
            const url = new URL(baseUrl);
            url.searchParams.append('mode', 'backbone');
            url.searchParams.append('country_code__in', 'US');
            url.searchParams.append('page', page);

            const req = await fetch(url.href, {
                method: "GET",
                headers: {
                    Authorization: `Token ${String(proxyToken)}`
                }
            });

            const response = await req.json();
            console.log("DATA: reading...: ", page);

            if (response.results) {
                const filteredResults = response.results.map(filterProxy);
                allProxies = [...allProxies, ...filteredResults];

                if (page == 3) {
                    break;
                }
            }

            page += 1;
        }

        // Process and save the proxies
        processAndSaveProxies();

        console.log(`Total IPs retrieved: ${allProxies.length}`);
        console.log('IPs saved to ips.json');
    } catch (error) {
        console.error('Error fetching proxies:', error);
    }
};

const processAndSaveProxies = () => {
    // Sort the proxies by city name
    allProxies.sort((a, b) => {
        if (!a.city_name) return 1;
        if (!b.city_name) return -1;
        return a.city_name.localeCompare(b.city_name);
    });

    // Group proxies by the first letter of the city name
    const groupedProxies = allProxies.reduce((acc, proxy) => {
        if (!proxy.city_name) return acc;
        const firstLetter = proxy.city_name[0].toUpperCase();
        if (!acc[firstLetter]) {
            acc[firstLetter] = [];
        }
        acc[firstLetter].push(proxy);
        return acc;
    }, {});

    // Write the grouped proxies to a JSON file
    const jsonContent = JSON.stringify(groupedProxies, null, 2);
    fs.writeFileSync('ips.json', jsonContent, 'utf8');
};

fetchProxies();
