const puppeteer = require('puppeteer');
const request = require('request-promise');

let browser;

async function verifyProxy() {
    try {
        const data = await request({
            url: 'http://ipv4.webshare.io/',
            proxy: 'http://wxvulwqk-rotate:q8jvoil91b2g@p.webshare.io:80'
        });
        console.log('Proxy verified:', data);
        return true;
    } catch (error) {
        console.error('Error verifying proxy:', error);
        return false;
    }
}

async function submitForm(fullName = "f_name", email = "me@mail.com", zipcode = "43X00", age = "23") {
    try {
        const proxyVerified = await verifyProxy();
        if (!proxyVerified) throw new Error('Proxy verification failed');

        browser = await puppeteer.launch({
            headless: true,
            args: ['--proxy-server=p.webshare.io:80'],
        }); // Set to false for debugging
        const page = await browser.newPage();

        await page.authenticate({
            username: 'wxvulwqk-rotate',
            password: 'q8jvoil91b2g'
        });

        // Go to the target form URL
        let resp = await page.goto(process.env.TARGET_FORM_URL, { waitUntil: 'networkidle2' });
        console.log('Page loaded:', resp.status(), resp.url());

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
                return Array.from(inputs).every(input => input.value === '');
            },
            { timeout: 60000 } // Adjust timeout as needed
        );
        await browser.close();

        console.log('Form fields are now empty.');
        return `Form submitted for ${fullName}, ${email}, ${zipcode}, ${age}`;
    } catch (error) {
        console.error('Error during form submission:', error);
        if (browser) await browser.close();
        throw error;
    }
}

module.exports = { submitForm };
