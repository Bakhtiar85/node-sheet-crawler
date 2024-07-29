const puppeteer = require('puppeteer');
const request = require('request-promise');
const UserAgent = require('user-agents');

let browser;
let puppeteerProxy;

async function verifyProxy() {
    try {
        const data = await request({
            url: `${process.env.PROXY_PROTOCOL}://${process.env.PROXY_URL}/`,
            proxy: `${process.env.PROXY_PROTOCOL}://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_SERVER}:${process.env.PROXY_PORT}`
        });
        puppeteerProxy = data;
        console.log('Proxy verified:', data);
        return true;
    } catch (error) {
        console.error('Error verifying proxy:', error);
        return false;
    }
}

async function submitForm(fullName = "f_name", email = "me@mail.com", zipcode = "43X00", age = "23", is_testing_url = false) {
    try {
        const proxyVerified = await verifyProxy();
        if (!proxyVerified) throw new Error('Proxy verification failed');

        browser = await puppeteer.launch({
            headless: process.env.HEADLESS === 'true',
            args: [
                `--proxy-server=${process.env.PROXY_SERVER}:${process.env.PROXY_PORT}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        }); // Set to false for debugging

        const userAgent = new UserAgent({ deviceCategory: 'desktop' }); // You can specify the device category

        const randomUserAgent = userAgent.toString();

        const page = await browser.newPage();

        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD
        });

        await page.setUserAgent(randomUserAgent);

        const getPlatformFromUA = (ua) => {
            if (ua.includes("Windows")) return "Windows";
            if (ua.includes("Macintosh")) return "macOS";
            if (ua.includes("Linux")) return "Linux";
            if (ua.includes("Android")) return "Android";
            if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
            return "Unknown";
        };

        const platform = getPlatformFromUA(randomUserAgent);

        await page.setUserAgent(randomUserAgent);

        await page.evaluateOnNewDocument((randomUserAgent, platform) => {
            Object.defineProperty(navigator, 'platform', {
                get: () => platform,
            });
            Object.defineProperty(navigator, 'userAgent', {
                get: () => randomUserAgent,
            });
            Object.defineProperty(navigator, 'appVersion', {
                get: () => platform,
            });
            // You might want to adjust window size based on the device type in the user agent
            window.outerWidth = 1920;
            window.outerHeight = 1080;
            window.chrome = {
                runtime: {},
            };
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

        // Go to the target form URL
        let resp = await page.goto(process.env.TARGET_FORM_URL, { waitUntil: 'networkidle2' });
        console.log('Page loaded:', resp.status(), resp.url());
        if (!is_testing_url) {
            // Select input fields
            const inputs = await page.$$('form input');
            console.log('Inputs found:', inputs.length);

            if (inputs.length < 4) {
                console.error('Not enough input fields found');
                return;
            }

            // Fill in the form fields
            await inputs[0].click(); // Click to focus on the first input field
            await inputs[0].type(fullName); // Type fullName into the first input field

            await inputs[1].click(); // Click to focus on the second input field
            await inputs[1].type(email); // Type email into the second input field

            await inputs[2].click(); // Click to focus on the third input field
            await inputs[2].type(age); // Type age into the third input field

            await inputs[3].click(); // Click to focus on the fourth input field
            await inputs[3].type(zipcode); // Type zipcode into the fourth input field

            console.log("PUPPETEER: Filling form with", { fullName, email, zipcode, age });

            // Submit the form
            // Replace with the actual selector for the submit button
            await page.click('button[type="submit"]');
            console.log('Form submitted.');

            // Wait for the form fields to be empty
            await page.waitForFunction(
                () => {
                    const inputs = document.querySelectorAll('input');
                    return Array.from(inputs).slice(0, 4).every(input => input.value === '');
                }
            );
        }
        console.log('Form fields are now empty.');
        return `Form submitted for ${fullName}, ${email}, ${zipcode}, ${age}, ${puppeteerProxy}`;
    } catch (error) {
        console.error('Error during form submission:', error);
        if (browser) await browser.close();
        throw error;
    } finally {
        if (!is_testing_url) {
            await browser.close();
        }
    }
}

module.exports = { submitForm };
