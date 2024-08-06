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
        const city = response.data.places[0]['place name'];

        if (!country || !city) throw new Error('Location data incomplete');
        return { country, city };
    } catch (error) {
        return null;
    }
}

async function getCityFromPhoneNumber(phoneNumber) {
    const areaCode = extractAreaCode(phoneNumber);
    if (areaCode) {
        const cityInfo = findCityByAreaCode(areaCode);
        if (cityInfo) {
            return { country: 'US', city: cityInfo.city };
        } else {
            return null;
        }
    } else {
        throw new Error('Invalid phone number format.');
    }
}

function extractAreaCode(phoneNumber) {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid US number (assuming US numbers here)
    if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1')) {
        // Return the area code (first 3 digits after the country code if present)
        return digitsOnly.slice(-10, -7);
    }

    return null; // Return null if the phone number format is invalid
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
