const puppeteer = require('puppeteer');
const request = require('request-promise');
const { getProxyForLocation } = require('./proxyService');
const { setupBrowser } = require('./browserService');

let browser, page;
let puppeteerProxy;
const waitTime = Math.random() * 100; // 50s to 150s

// Array of possible referrer URLs
const referrers = [
    'https://www.google.com/', 'https://www.facebook.com/', 'https://www.twitter.com/', 'https://www.linkedin.com/', 'https://www.instagram.com/', 'https://www.reddit.com/', 'https://www.pinterest.com/', 'https://www.youtube.com/', 'https://www.tumblr.com/', 'https://www.snapchat.com/', 'https://www.quora.com/', 'https://www.medium.com/', 'https://www.github.com/', 'https://www.stackoverflow.com/', 'https://www.bing.com/', 'https://www.yahoo.com/', 'https://www.yandex.com/', 'https://www.duckduckgo.com/', 'https://www.vk.com/', 'https://www.weibo.com/', 'https://www.tiktok.com/', 'https://www.whatsapp.com/', 'https://www.telegram.org/', 'https://www.slack.com/', 'https://www.microsoft.com/', 'https://www.apple.com/', 'https://www.amazon.com/', 'https://www.netflix.com/', 'https://www.hulu.com/', 'https://www.spotify.com/'
];

async function submitForm(fullName = "f_name", phone = "(555) 890-1234", zipcode = "80004", age = "23", is_testing_url = false, countryCityInfo={country: "US", citry: "Arvada"}) {
    try {

        let { country, city } = countryCityInfo;

        const proxy = await getProxyForLocation(country, city);

        // console.log("PROxY:", proxy);

        if (!proxy) throw new Error('No proxy found for location');

        ({ browser, page } = await setupBrowser(proxy));
        console.log("browser, page, PROxY :>>", { browser, page, proxy })

        // Select a random referrer
        const randomReferrer = referrers[Math.floor(Math.random() * referrers.length)];

        // Set up navigation to include the random referrer information
        await page.setExtraHTTPHeaders({
            referer: randomReferrer
        });

        let resp = await page.goto(process.env.TARGET_FORM_URL, { waitUntil: 'networkidle2' });
        // console.log('Page loaded:', resp.status(), resp.url());

        if (!is_testing_url) {
            // Reload the page to simulate a user action
            await page.reload({ waitUntil: 'networkidle2' });

            // Randomize events order: click, scroll, mouse movements
            const events = ['click', 'scroll', 'mouse'];
            events.sort(() => Math.random() - 0.5);

            for (const event of events) {
                if (event === 'click') {
                    // Random click actions
                    for (let i = 0; i < 8; i++) {
                        await page.keyboard.down('Control');
                        await page.mouse.click(Math.random() * page.viewport().width, Math.random() * page.viewport().height);
                        await page.keyboard.up('Control');
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 200)); // wait between for few seconds
                    }
                } else if (event === 'scroll') {
                    // Random scroll actions
                    for (let i = 0; i < 3; i++) {
                        await page.evaluate(() => window.scrollBy(0, Math.random() * window.innerHeight));
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 200)); // wait between for few seconds
                        await page.evaluate(() => window.scrollBy(0, 0));
                    }
                } else if (event === 'mouse') {
                    // Random mouse movements
                    for (let i = 0; i < 5; i++) {
                        await page.mouse.move(Math.random() * page.viewport().width, Math.random() * page.viewport().height, { steps: 10 });
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 200)); // wait between for few seconds
                    }
                }
            }

            // Function to type like a human
            async function typeLikeHuman(selector, text) {
                await selector.click();
                for (const char of text) {
                    await page.keyboard.type(char);
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 20)); // random delay between keystrokes
                }
            }

            // Wait for the page to load and form to be available
            await page.waitForSelector('form input[name="Phone"]');
            await page.waitForSelector('form input[name="zipcode"]');

            // Select input fields
            const phoneInput = await page.$('form input[name="Phone"]');
            const zipcodeInput = await page.$('form input[name="zipcode"]');
            const checkbox = await page.$('#leadid_tcpa_disclosure');

            // Fill in the form fields
            await typeLikeHuman(phoneInput, phone);
            await typeLikeHuman(zipcodeInput, zipcode);

            // Check the checkbox
            if (checkbox) {
                await checkbox.click();
            } else {
                console.error('Checkbox not found');
            }

            // Submit the form
            await page.click('input[type="submit"]');
            // console.log('Form submitted.');
            // Wait for the confirmation message to appear
            await page.waitForSelector('div.wpcf7-response-output', { visible: true });

            await new Promise(resolve => setTimeout(resolve, waitTime / 2));

            // Optionally, you can verify the confirmation message text
            const confirmationText = await page.$eval('div.wpcf7-response-output', el => el.textContent);
            if (confirmationText.includes('Thank you for your message. It has been sent.')) {
                console.log('Form successfully submitted.');

                await page.goto("https://sheetlogger.sn66.me/", { waitUntil: 'networkidle2' })

                // Wait for the page to load and form to be available
                await page.waitForSelector('form input[name="Phone"]');
                await page.waitForSelector('form input[name="zipcode"]');
                // Select input fields
                const phoneInput = await page.$('form input[name="Phone"]');
                const zipcodeInput = await page.$('form input[name="zipcode"]');

                // Fill in the form fields
                await typeLikeHuman(phoneInput, phone);
                await typeLikeHuman(zipcodeInput, zipcode);

                // Submit the form
                await page.click('button[type="submit"]');

                await page.waitForFunction(
                    () => {
                        const inputs = document.querySelectorAll('input');
                        return Array.from(inputs).slice(0, 2).every(input => input.value === '');
                    }
                );

            } else {
                console.error('Form submission failed or confirmation message not found.');
            }
        }
        // console.log('Form fields are now empty.');
        return `Form submitted for ${fullName}, ${phone}, ${zipcode}, ${age}, ${puppeteerProxy}`;
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
