const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load area codes data
const areaCodesData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/area-codes-usa.json'), 'utf8'));

async function zipToCountryCity(zipCode) {
    const url = `https://api.zippopotam.us/us/${zipCode}`;
    try {
        const response = await axios.get(url);
        const country = response.data['country abbreviation'];
        const state = response.data.places[0]['state'];
        const city = response.data.places[0]['place name'];

        if (!country || !state || !city) throw new Error('Location data incomplete');
        return { country, state, city };
    } catch (error) {
        return null;
    }
}

async function getCityFromPhoneNumber(phoneNumber) {
    const areaCode = extractAreaCode(phoneNumber);
    if (areaCode) {
        const cityInfo = findCityByAreaCode(areaCode);
        if (cityInfo) {
            return { country: 'US', state: cityInfo.state, city: cityInfo.city };
        } else {
            return null;
        }
    } else {
        // console.log('Invalid phone number format.');
        return null;
    }
}

function extractAreaCode(phoneNumber) {
    // Regular expression to match the area code in various formats
    const regex = /(?:\+1\s*)?\(?(\d{3})\)?[\s-]?/;
    const match = phoneNumber.match(regex);

    if (match) {
        return match[1];
    } else {
        return null;
    }
}

function findCityByAreaCode(areaCode) {
    const areaCodeInfo = areaCodesData.find(entry => entry['area-code'] == areaCode);
    if (areaCodeInfo) {
        return {
            city: areaCodeInfo.city,
            state: areaCodeInfo.state
        };
    }
    return null;
}

module.exports = { zipToCountryCity, getCityFromPhoneNumber };
