// index.js
require('dotenv').config();
const express = require('express');
const Bot = require('./NodeBot');

const app = express();
const port = 3000;

const spreadsheetId = String(process.env.SPREADSHEET_ID);
const sheetName = String(process.env.SHEET_NAME);

const bots = [];

function createNewBot() {
    const botId = bots.length + 1;
    const bot = new Bot(spreadsheetId, sheetName, botId);
    bots.push(bot);
    bot.start();
    return botId;
}

app.get('/spawn', (req, res) => {
    const botId = createNewBot();
    res.send(`Spawned new bot with ID: ${botId}`);
});

app.get('/status', (req, res) => {
    res.json({
        totalBots: bots.length,
        botIds: bots.map(bot => bot.botId)
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});