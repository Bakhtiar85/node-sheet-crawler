const puppeteer = require('puppeteer');

const isProxyPlanFree = process.env.IS_PROXY_PLAN_FREE === "true";
let proxyServerString = null;

const deviceConfigurations = [
    { platform: 'Windows 10', browsers: ['Chrome', 'Firefox', 'Edge'], osInfo: 'Windows NT 10.0; Win64; x64', screenSize: { width: 1920, height: 1080 } },
    { platform: 'Windows 11', browsers: ['Chrome', 'Firefox', 'Edge'], osInfo: 'Windows NT 11.0; Win64; x64', screenSize: { width: 2560, height: 1440 } },
    { platform: 'macOS', browsers: ['Chrome', 'Firefox', 'Safari'], osInfo: 'Macintosh; Intel Mac OS X 10_15_7', screenSize: { width: 2560, height: 1600 } },
    { platform: 'Linux', browsers: ['Chrome', 'Firefox'], osInfo: 'X11; Linux x86_64', screenSize: { width: 1920, height: 1080 } },
    { platform: 'Android', browsers: ['Chrome'], osInfo: 'Linux; Android 13; Mobile', screenSize: { width: 412, height: 915 } },
    { platform: 'iOS', browsers: ['Safari', 'Chrome'], osInfo: 'iPhone; CPU iPhone OS 16_0 like Mac OS X', screenSize: { width: 390, height: 844 } },
    { platform: 'Chrome OS', browsers: ['Chrome'], osInfo: 'X11; CrOS x86_64 14526.102.0', screenSize: { width: 1366, height: 768 } },
];

async function setupBrowser(proxy, botId) {
    if (isProxyPlanFree) {
        proxyServerString = `${proxy.server}:${proxy.port}`; // with 10 free proxies
    } else {
        proxyServerString = `http://p.webshare.io:${proxy.port}`; // with 7$ plan
    }

    const browser = await puppeteer.launch({
        headless: process.env.HEADLESS === 'true',
        args: [
            `--proxy-server=${proxyServerString}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors',
        ],
    });

    const page = await browser.newPage();

    await page.authenticate({
        username: proxy.username,
        password: proxy.password
    });

    const { userAgent, platform, osInfo, screenSize } = generateUniqueUserAgent(botId);
    await page.setUserAgent(userAgent);

    await page.evaluateOnNewDocument((userAgent, platform, osInfo, screenSize) => {
        Object.defineProperty(navigator, 'platform', { value: platform });
        Object.defineProperty(navigator, 'userAgent', { value: userAgent });
        Object.defineProperty(navigator, 'appVersion', { value: osInfo });
        window.outerWidth = screenSize.width + Math.floor(Math.random() * 100);
        window.outerHeight = screenSize.height + Math.floor(Math.random() * 100);
        window.screen = {
            availWidth: screenSize.width,
            availHeight: screenSize.height,
            width: screenSize.width,
            height: screenSize.height,
        };
        window.chrome = { runtime: {} };
        const originalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function (...args) {
            const pc = new originalRTCPeerConnection(...args);
            pc.createDataChannel = function () { return {}; };
            return pc;
        };
    }, userAgent, platform, osInfo, screenSize);

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        const url = request.url();
        const resourceType = request.resourceType();

        // Modify headers for all requests
        const headers = request.headers();
        headers['sec-ch-ua-platform'] = `"${platform}"`;
        headers['user-agent'] = userAgent;

        // Block specific resource types
        if (['stylesheet', 'image', 'font', 'media'].includes(resourceType)) {
            request.abort();
        } else {
            request.continue({ headers });
        }
    });

    return { browser, page };
}

function generateUniqueUserAgent(botId) {
    const configIndex = Math.floor(Math.random() * deviceConfigurations.length);
    const config = deviceConfigurations[configIndex];

    const browserIndex = Math.floor(Math.random() * config.browsers.length);
    const browser = config.browsers[browserIndex];

    const generateVersion = () => Math.floor(Math.random() * 20) + 90;

    let userAgent;

    switch (browser) {
        case 'Chrome':
            userAgent = `Mozilla/5.0 (${config.osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36`;
            break;
        case 'Firefox':
            userAgent = `Mozilla/5.0 (${config.osInfo}; rv:${generateVersion()}.0) Gecko/20100101 Firefox/${generateVersion()}.0`;
            break;
        case 'Safari':
            userAgent = `Mozilla/5.0 (${config.osInfo}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${generateVersion()}.0 Safari/605.1.15`;
            break;
        case 'Edge':
            userAgent = `Mozilla/5.0 (${config.osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36 Edg/${generateVersion()}.0.${generateVersion()}.0`;
            break;
    }

    return { userAgent, platform: config.platform, osInfo: config.osInfo, screenSize: config.screenSize };
}

module.exports = { setupBrowser };
