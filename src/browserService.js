const puppeteer = require('puppeteer');

const isProxyPlanFree = process.env.IS_PROXY_PLAN_FREE === "true";
let proxyServerString = null;

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

    const { userAgent, platform, osInfo } = generateUniqueUserAgent(botId);
    await page.setUserAgent(userAgent);

    await page.evaluateOnNewDocument((userAgent, platform, osInfo) => {
        Object.defineProperty(navigator, 'platform', { value: platform });
        Object.defineProperty(navigator, 'userAgent', { value: userAgent });
        Object.defineProperty(navigator, 'appVersion', { value: osInfo });
        window.outerWidth = 1920;
        window.outerHeight = 1080;
        window.chrome = { runtime: {} };
        const originalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function (...args) {
            const pc = new originalRTCPeerConnection(...args);
            pc.createDataChannel = function () { return {}; };
            return pc;
        };
    }, userAgent, platform, osInfo);

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
    const platforms = [
        'Windows 11', 'Windows 10',
        'macOS Ventura', 'macOS Monterey', 'macOS Big Sur',
        'Ubuntu 22.04', 'Fedora 37', 'Linux Mint 21',
        'Android 13', 'Android 12',
        'iOS 16', 'iOS 15',
        'Chrome OS'
    ];

    const browsers = [
        'Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'
    ];

    // Randomly select platform and browser
    const platformIndex = Math.floor(Math.random() * platforms.length);
    const browserIndex = Math.floor(Math.random() * browsers.length);

    const platform = platforms[platformIndex];
    let browser = browsers[browserIndex];
    
    // console.log(platformIndex, "<<<<, platform ,>>>>", platform, " <<", botId, ">> ", browserIndex, "<<<<, browser ,>>>>", browser);

    let userAgent;
    let osInfo;

    const generateVersion = () => Math.floor(Math.random() * 20) + 90; // Generate a random version between 90 and 110

    switch (platform) {
        case 'Windows 11':
        case 'Windows 10':
            osInfo = 'Windows NT 10.0; Win64; x64';
            break;
        case 'macOS Ventura':
        case 'macOS Monterey':
        case 'macOS Big Sur':
            osInfo = 'Macintosh; Intel Mac OS X 10_15_7';
            break;
        case 'Ubuntu 22.04':
        case 'Fedora 37':
        case 'Linux Mint 21':
            osInfo = 'X11; Linux x86_64';
            break;
        case 'Android 13':
        case 'Android 12':
            osInfo = `Linux; Android ${platform.split(' ')[1]}; Mobile`;
            break;
        case 'iOS 16':
        case 'iOS 15':
            osInfo = `iPhone; CPU iPhone OS ${platform.split(' ')[1]}_0 like Mac OS X`;
            break;
        case 'Chrome OS':
            osInfo = 'X11; CrOS x86_64 14526.102.0';
            break;
        default:
            console.warn(`Unknown platform: ${platform}`);
            osInfo = 'Windows NT 10.0; Win64; x64'; // Default to Windows 10
    }

    switch (browser) {
        case 'Chrome':
            userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36`;
            break;
        case 'Firefox':
            userAgent = `Mozilla/5.0 (${osInfo}; rv:${generateVersion()}.0) Gecko/20100101 Firefox/${generateVersion()}.0`;
            break;
        case 'Safari':
            userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${generateVersion()}.0 Safari/605.1.15`;
            break;
        case 'Edge':
            userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36 Edg/${generateVersion()}.0.${generateVersion()}.0`;
            break;
        case 'Opera':
            userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36 OPR/${generateVersion()}.0.${generateVersion()}.0`;
            break;
        default:
            if (platform.includes('Windows')) {
                console.warn(`Unknown browser for Windows: ${browser}. Defaulting to Edge.`);
                browser = 'Edge';
                userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36 Edg/${generateVersion()}.0.${generateVersion()}.0`;
            } else {
                console.warn(`Unknown browser: ${browser}. Defaulting to Chrome.`);
                browser = 'Chrome';
                userAgent = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${generateVersion()}.0.0.0 Safari/537.36`;
            }
    }

    return { userAgent, platform, osInfo };
}

module.exports = { setupBrowser };
