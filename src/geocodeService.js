const axios = require('axios');

async function zipToCountryCity(zipCode) {
    // Assuming US zip codes for this example. Adjust the URL for other countries if needed.
    const url = `https://api.zippopotam.us/us/${zipCode}`;

    try {
        const response = await axios.get(url);

        // console.log("Zipcode resp : >>>>>>>>>>>", response.data);
        // Extract country and city from the response
        const country = response.data['country abbreviation'];
        // The API returns an array of places. We'll use the first one.
        const city = response.data.places[0]['place name'];

        if (!country || !city) throw new Error('Location data incomplete');
        
        return { country, city };
    } catch (error) {
        console.error('Error fetching location data:', error.message);
        // If there's an error, return null or a default value
        return null;
    }
}

module.exports = { zipToCountryCity };