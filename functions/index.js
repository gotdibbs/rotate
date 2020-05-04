module.exports = {
    // HTTPS Triggers
    oauth_redirect: require('./https/handleOauthRedirect'),
    command_rotate: require('./https/handleRotate'),
    interaction: require('./https/handleInteraction'),

    // Database Triggers
    handleRotate: require('./database/handleRotate'),
    handleInteraction: require('./database/handleInteraction')
};