let accessToken = null;

export const tokenStore = {
    set(tokenValue) {
        accessToken = tokenValue;
    },

    get() {
        return accessToken;
    },

    clear() {
        accessToken = null;
    },
};