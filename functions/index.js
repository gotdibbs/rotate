module.exports = {
    // HTTPS Triggers
    oauth_redirect: require('./https/handleOauthRedirect'),
    command_rotate: require('./https/handleRotate'),

    // Database Triggers
    handleRotate: require('./database/handleRotate')
};