const functions = require('firebase-functions');

const admin = require('../lib/admin');

module.exports = functions.https.onRequest(async (request, response) => {
    if (request.method !== 'POST') {
        console.error(`Got unsupported ${request.method} request. Expected POST.`);
        return response.status(405).send('Only POST requests are accepted');
    }

    const interaction = JSON.parse(request.body.payload);
    if (interaction.token !== functions.config().slack.token) {
        console.error(`Invalid request token ${interaction.token} from ${interaction.team_id} (${interaction.team_domain}.slack.com)`);
        return response.status(401).send('Invalid request token!');
    }

    // Handle the commands later, Slack expect this request to return within 3000ms
    await admin.database().ref('interactions').push(interaction);

    return response.contentType('json').status(200).send({
        delete_original: true
    });
});