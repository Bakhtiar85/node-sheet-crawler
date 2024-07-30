const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');

async function setupBrowser(proxy) {
    // console.log('Setting up browser with proxy:', JSON.stringify(proxy, null, 2));
    const browser = await puppeteer.launch({
        headless: process.env.HEADLESS === 'true',
        args: [
            `--proxy-server=${proxy.server}:${proxy.port}`,
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
    console.log('Page authenticated with proxy : >>>>>>>>>>>', proxy);

    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    const randomUserAgent = userAgent.toString();
    await page.setUserAgent(randomUserAgent);

    const platform = getPlatformFromUA(randomUserAgent);

    await page.evaluateOnNewDocument((randomUserAgent, platform) => {
        Object.defineProperty(navigator, 'platform', { get: () => platform });
        Object.defineProperty(navigator, 'userAgent', { get: () => randomUserAgent });
        Object.defineProperty(navigator, 'appVersion', { get: () => platform });
        window.outerWidth = 1920;
        window.outerHeight = 1080;
        window.chrome = { runtime: {} };
        const originalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function (...args) {
            const pc = new originalRTCPeerConnection(...args);
            pc.createDataChannel = function () { return {}; };
            return pc;
        };
    }, randomUserAgent, platform);

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        const headers = request.headers();
        headers['sec-ch-ua-platform'] = `"${platform}"`;
        headers['user-agent'] = randomUserAgent;
        request.continue({ headers });
    });

    return { browser, page };
}

function getPlatformFromUA(ua) {
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Macintosh")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    return "Unknown";
}

module.exports = { setupBrowser };