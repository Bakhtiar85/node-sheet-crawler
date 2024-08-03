// NodeBot.js
require('dotenv').config();
const { google } = require('googleapis');
const { zipToCountryCity } = require('./src/geocodeService');
const { getProxyForLocation } = require('./src/proxyService');
const { setupBrowser } = require('./src/browserService');
const { submitForm } = require('./src/puppeteerForm');
const { getValues } = require('./state');

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

    async processRow(row) {
        const [timestamp, fullName, phone, zipcode, age] = row;
        if (timestamp === "Timestamp") return;

        try {
            const countryCityInfo = await zipToCountryCity(zipcode);
            if (!countryCityInfo) {
                console.log(`Bot ${this.botId}: Invalid or unsupported ZIP code:`, zipcode);
                return;
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

                    await submitForm(fullName, phone, zipcode, age, false, countryCityInfo, this.botId, browserInstance);
                    success = true;
                    break;
                } catch (submitError) {
                    console.error(`Bot ${this.botId}: Error submitting form (attempt ${attempt + 1}):`, submitError);
                } finally {
                    if (browserInstance) {
                        let { browser } = browserInstance
                        await browser.close();
                    }
                }
            }

            if (!success) {
                console.error(`Bot ${this.botId}: Failed to submit form after maximum attempts`);
                console.log(`Bot ${this.botId}: Failed values:`, { phone, zipcode });
            } else {
                const values = getValues();
                console.log(`Bot ${this.botId}: Entry Submitted on dashboard:`, { phone, zipcode, values });
            }
        } catch (error) {
            console.error(`Bot ${this.botId}: Error processing row:`, error);
        }
    }

    async checkSheet() {
        const range = `${this.sheetName}!A${this.lastRow}:E`;
        const rows = await this.fetchSheetData(range);

        if (rows.length > 0) {
            for (const row of rows) {
                await this.processRow(row);
                this.lastRow++;
            }
        }

        setTimeout(() => {
            console.log(`Bot ${this.botId}: Checking for new entries after 30 seconds.`);
            this.checkSheet();
        }, 30000);
    }

    start() {
        console.log(`Bot ${this.botId}: Starting`);
        this.checkSheet();
    }
}

module.exports = Bot;