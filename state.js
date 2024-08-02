const state = {
    ipAddress: null,
    browserInfo: null,
    osInfo: null,
};

const setIPAddress = (ip) => { state.ipAddress = ip; };
const setBrowserInfo = (browser) => { state.browserInfo = browser; };
const setOSInfo = (os) => { state.osInfo = os; };

const getValues = () => ({ ...state });

module.exports = {
    setIPAddress,
    setBrowserInfo,
    setOSInfo,
    getValues,
};
