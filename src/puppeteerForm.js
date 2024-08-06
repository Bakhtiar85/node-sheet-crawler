const puppeteer = require('puppeteer');

const waitTime = Math.random() * 20 + 50; // 50s to 100s
const maxRetriesOnForm = 2;
// Array of possible referrer URLs
const referrers = [
    'https://www.google.com/', 'https://www.facebook.com/', 'https://www.twitter.com/', 'https://www.linkedin.com/', 'https://www.instagram.com/', 'https://www.reddit.com/', 'https://www.pinterest.com/', 'https://www.youtube.com/', 'https://www.tumblr.com/', 'https://www.snapchat.com/', 'https://www.quora.com/', 'https://www.medium.com/', 'https://www.github.com/', 'https://www.stackoverflow.com/', 'https://www.bing.com/', 'https://www.yahoo.com/', 'https://www.yandex.com/', 'https://www.duckduckgo.com/', 'https://www.vk.com/', 'https://www.weibo.com/', 'https://www.tiktok.com/', 'https://www.whatsapp.com/', 'https://www.telegram.org/', 'https://www.slack.com/', 'https://www.microsoft.com/', 'https://www.apple.com/', 'https://www.amazon.com/', 'https://www.netflix.com/', 'https://www.hulu.com/', 'https://www.spotify.com/'
];

async function submitForm(fullName = "f_name", phone = "(555) 890-1234", zipcode = "80004", age = "23", is_testing_url = false, countryCityInfo = { country: "US", city: "Arvada" }, botId, browserInstance) {
    try {
        let { page } = browserInstance;

        const randomReferrer = referrers[Math.floor(Math.random() * referrers.length)];
        await page.setExtraHTTPHeaders({ referer: randomReferrer });

        await page.goto(process.env.TARGET_FORM_URL, { waitUntil: 'networkidle2' });

        if (!is_testing_url) {
            // await page.reload({ waitUntil: 'networkidle2' });

            const events = ['click', 'mouse'];
            events.sort(() => Math.random() - 0.5);

            for (const event of events) {
                if (event === 'scroll') {
                    for (let i = 0; i < 2; i++) {
                        await page.evaluate(() => window.scrollBy(0, Math.random() * window.innerHeight));
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                        await page.evaluate(() => window.scrollBy(0, 0));
                    }
                } else if (event === 'mouse') {
                    for (let i = 0; i < 2; i++) {
                        await page.mouse.move(Math.random() * page.viewport().width, Math.random() * page.viewport().height, { steps: 5 });
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                    }
                }
            }

            async function typeLikeHuman(selector, text) {
                await selector.click();

                // Clear the input field before typing
                await selector.evaluate(input => input.value = '');

                for (const char of text) {
                    await page.keyboard.type(char);
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                }
            }

            async function isFormReady() {
                const [phoneValue, zipcodeValue, checkboxChecked] = await Promise.all([
                    page.$eval('form input[name="Phone"]', el => el.value),
                    page.$eval('form input[name="zipcode"]', el => el.value),
                    page.$eval('#leadid_tcpa_disclosure', el => el.checked)
                ]);
                return phoneValue === phone && zipcodeValue === zipcode && checkboxChecked;
            }

            await Promise.all([
                page.waitForSelector('form input[name="Phone"]'),
                page.waitForSelector('form input[name="zipcode"]'),
                page.waitForSelector('#leadid_tcpa_disclosure')
            ]);

            const [phoneInput, zipcodeInput, checkbox] = await Promise.all([
                page.$('form input[name="Phone"]'),
                page.$('form input[name="zipcode"]'),
                page.$('#leadid_tcpa_disclosure')
            ]);

            await typeLikeHuman(phoneInput, phone);
            await typeLikeHuman(zipcodeInput, zipcode);
            if (checkbox) await checkbox.click();
            else { console.error('Checkbox not found'); return; }

            let retries = 0;
            while (retries < maxRetriesOnForm && !(await isFormReady())) {
                console.log('Form not ready, retrying...');
                await typeLikeHuman(phoneInput, phone);
                await typeLikeHuman(zipcodeInput, zipcode);
                if (checkbox && !await page.$eval('#leadid_tcpa_disclosure', el => el.checked)) {
                    await checkbox.click();
                }
                await new Promise(resolve => setTimeout(resolve, 100)); // Shorter wait before retry
                retries++;
            }

            if (await isFormReady()) {
                await page.click('input[type="submit"]');
                await new Promise(resolve => setTimeout(resolve, waitTime / 2));
                await page.waitForSelector('div.wpcf7-response-output', { visible: true, timeout: 5000 });

                const confirmationText = await page.$eval('div.wpcf7-response-output', el => el.textContent);
                
                if (confirmationText.includes('Thank you for your message. It has been sent.')) {
                    // console.log(`${process.env.TARGET_FORM_URL} ::: Form successfully submitted.`);

                    await page.goto("https://sheetlogger.sn66.me/", { waitUntil: 'networkidle2' });
                    await new Promise(resolve => setTimeout(resolve, waitTime / 10));

                    async function is2ndFormReady() {
                        const [phone2ndValue, zipcode2ndValue] = await Promise.all([
                            page.$eval('form#php-form input[name="Phone"]', el => el.value),
                            page.$eval('form#php-form input[name="zipcode"]', el => el.value),
                        ]);
                        return phone2ndValue === phone && zipcode2ndValue === zipcode;
                    }

                    const [phone2ndInput, zipcode2ndInput] = await Promise.all([
                        page.$('form#php-form input[name="Phone"]'),
                        page.$('form#php-form input[name="zipcode"]'),
                    ]);

                    await typeLikeHuman(phone2ndInput, phone);
                    await typeLikeHuman(zipcode2ndInput, zipcode);

                    retries = 0;
                    while (retries < maxRetriesOnForm && !(await is2ndFormReady())) {
                        await typeLikeHuman(phone2ndInput, phone);
                        await typeLikeHuman(zipcode2ndInput, zipcode);
                        await new Promise(resolve => setTimeout(resolve, 100)); // Shorter wait before retry
                        retries++;
                    }

                    if (is2ndFormReady) {
                        await page.click('button[type="submit"]');
                    } else {
                        return false;
                    }

                    await page.waitForFunction(
                        () => {
                            const inputs = document.querySelectorAll('input');
                            return Array.from(inputs).slice(0, 2).every(input => input.value === '');
                        },
                        { timeout: 5000 }
                    );

                } else {
                    throw new Error('Form submission failed or confirmation message not found.');
                }
            } else {
                throw new Error('Form could not be submitted after maximum retries');
            }
        }

        return `Form submitted for ${fullName}, ${phone}, ${zipcode}, ${age}`;
    } catch (error) {
        console.error('Error during form submission:', error);
        throw error;
    }
}

module.exports = { submitForm };
