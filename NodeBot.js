// NodeBot.js
require('dotenv').config();
const { google } = require('googleapis');
const { zipToCountryCity, getCityFromPhoneNumber } = require('./src/geocodeService');
const { getProxyForLocation } = require('./src/proxyService');
const { setupBrowser } = require('./src/browserService');
const { submitForm } = require('./src/puppeteerForm');
const { getValues } = require('./state');

const is_testing_url = process.env.IS_TESTING_URL === 'true';
let countSuccess = 0;
let failedEntries = [];

class Bot {
    constructor(spreadsheetId, sheetName, botId) {
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        this.botId = botId;
        this.lastRow = 1;
        this.retryAttempts = 3;

        this.sheets = google.sheets('v4');
        this.auth = new google.auth.GoogleAuth({
            keyFile: 'service-account-key.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    }

    async fetchSheetData(range) {
        try {
            const client = await this.auth.getClient();
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range,
                auth: client,
            });
            return response.data.values || [];
        } catch (error) {
            console.error(`Bot ${this.botId}: Error fetching data from Google Sheets:`, error);
            return [];
        }
    }

    async processRow(phone, zipcode) {
        try {
            let countryCityInfo = await zipToCountryCity(zipcode);
            if (!countryCityInfo) {
                countryCityInfo = await getCityFromPhoneNumber(phone);
                if (!countryCityInfo) {
                    countryCityInfo = {
                        country: 'US',
                        city: 'Bridgeport'
                    }
                    // let failedEntry = {
                    //     phone, zipcode, reason: "!ZIP&Area-Code"
                    // }
                    // failedEntries.push(failedEntry);
                    // // console.log(`Bot ${this.botId}: Invalid or unsupported ZIP code:`, zipcode);
                    // return;
                }
            }

            let success = false;
            for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
                let browserInstance = null;
                try {
                    const { country, city } = countryCityInfo;
                    const proxy = await getProxyForLocation(country, city);
                    if (!proxy) throw new Error('No proxy found for location');
                    browserInstance = await setupBrowser(proxy, this.botId);
                    // console.log(`Bot ${this.botId}: Browser setup complete`);
                    if (!browserInstance) throw new Error('No browser is setup');

                    await submitForm("fullName", phone, zipcode, 23, false, countryCityInfo, this.botId, browserInstance);
                    success = true;
                    break;
                } catch (submitError) {
                    console.error(`Bot ${this.botId}: Error submitting form (attempt ${attempt + 1}):`, submitError);
                } finally {
                    if (browserInstance && !is_testing_url) {
                        let { browser } = browserInstance
                        await browser.close();
                    }
                }
            }

            if (!success) {
                console.error(`Bot ${this.botId}: Failed to submit form after maximum attempts VALUES:`, { phone, zipcode });
                let failedEntry = {
                    phone, zipcode, reason: "!Retries"
                }
                failedEntries.push(failedEntry);
            } else {
                const values = getValues();
                countSuccess++;
                // console.log(`Bot ${this.botId}: Entry Submitted on dashboard:`, { phone, zipcode, values });
            }
        } catch (error) {
            console.error(`Bot ${this.botId}: Error processing row:`, error);
        }
    }

    async checkSheet() {
        const range = `${this.sheetName}!A${this.lastRow}:E`;
        const rows = await this.fetchSheetData(range);

        if (rows.length > 0) {
            console.log(`Process for ${rows.length} rows started`)
            console.time(`Complete Time taken for processing ${rows.length}`)
            for (const row of rows) {
                const [timestamp, phone, zipcode] = row;
                console.time(`Time taken to process: ${JSON.stringify({ phone, zipcode })}`);
                if (timestamp !== "Timestamp") await this.processRow(phone, zipcode);
                console.timeEnd(`Time taken to process: ${JSON.stringify({ phone, zipcode })}`);
                this.lastRow++;
            }
            console.timeEnd(`Complete Time taken for processing ${rows.length}`)
            console.log("Success rows inserted: ", countSuccess, " ::: ", "Failed Entires: ", JSON.stringify(failedEntries))
        }

        setTimeout(() => {
            // console.log(`Bot ${this.botId}: Checking for new entries after 3 seconds.`);
            countSuccess = 0;
            this.checkSheet();
        }, 3000);
    }

    start() {
        console.log(`Bot ${this.botId}: Starting`);
        if (is_testing_url) {
            // let testRow = ["123-456-7890", "90210"];
            this.processRow("123-456-7890", "90210");
        } else {
            this.checkSheet();
        }
    }
}

module.exports = Bot;