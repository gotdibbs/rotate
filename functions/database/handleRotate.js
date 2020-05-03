const functions = require('firebase-functions');
const rp = require('request-promise');

const admin = require('../lib/admin');

module.exports = functions.database.ref('commands/rotate/{id}').onCreate(async (snapshot, context) => {
    if (!snapshot.exists()) {
        return 'Nothing to do for deletion of processed commands.';
    }

    // Start by deleting the command itself from the queue
    await snapshot.ref.remove();

    const command = snapshot.val();

    const installationRef = admin.database().ref('installations').child(command.team_id);
    const installation = (await installationRef.once('value')).val();

    const configRef = admin.database().ref(`rotations/${command.team_id}-${command.channel_id}`);
    const config = await configRef.once('value');
    
    if (/current|share/.test(command.text)) {
        if (!config.exists()) {
            return sendRequestSet(command, installation);
        }

        const rotation = config.val();

        return sendRotation(rotation.people, command, installation, !/share/.test(command.text));
    }
    else if (/next/.test(command.text)) {
        if (!config.exists()) {
            return sendRequestSet(command, installation);
        }

        let rotation = config.val();

        let next = rotation.people.shift();

        rotation.people.push(next);

        await configRef.set({
            people: rotation.people
        });

        return sendRotation(rotation.people, command, installation, true);
    }
    else if (/^set/.test(command.text)) {
        const peopleMatch = /^set(.*)/.exec(command.text);

        if (peopleMatch.length < 2 || peopleMatch[1] == null) {
            return sendSetHelp(command, installation);
        }

        const people = peopleMatch[1].trim();
        const peopleList = people.split(',')
            .map(person => person.trim()) // clean up
            .filter(person => !!person); // remove any blanks

        await configRef.set({
            people: peopleList
        });

        return sendRotation(peopleList, command, installation, true);
    }
    else {
        return sendSetHelp(command, installation);
    }
});

function send(request, command, installation, isPrivate) {
    if (!isPrivate || !installation.scope || !installation.scope.includes('chat:write:bot')) {
        // Default to using the webhook for backwards compatibility
        // TODO: after installations are updates, we'll be able to hit `chat.postMessage` instead
        return rp(request);
    }

    // Modify the request to hit the ephemeral API
    request.uri = 'https://slack.com/api/chat.postEphemeral';
    request.headers = {
        'Authorization': 'Bearer ' + installation.token
    };
    request.body = {
        ...request.body,
        channel: command.channel_id,
        attachments: [],
        user: command.user_id
    };

    return rp(request);
}

function sendSetHelp(command, installation) {
    let blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Need help? You got it!*'
            }
        },
        {
            type: "divider"
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate set Person 1, Person 2`: Changes your rotation, with Person 1 up first'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate next`: Cycles through the rotation'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate current`: Displays the current rotation _but only to you_'
            }
        }
    ];

    if (installation.scope && installation.scope.includes('chat:write:bot')) {
        blocks = blocks.concat([
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '`/rotate share`: Sends the current state of the rotation to the team, _publicly_'
                }
            }
        ])
    }

    const options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            blocks,
            text: 'To set or update the rotation for this channel, try this: "/rotate set Person 1, Person 2, Person 3"'
        }
    };

    return send(options, command, installation, true);
}

function sendRequestSet(command, installation) {
    const options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            text: 'You need to set a rotation first.\nTo set a new rotation, try this: "/rotate set Person 1, Person 2, Person 3"'
        }
    };

    return send(options, command, installation, true);
}

function sendRotation(people, command, installation, isPrivate) {
    let response = [
        'Here\'s the current rotation:',
        ` 1. Next up: *${people.shift()}*`
    ];

    people.forEach((person, index) => {
        response.push(` ${index + 2}. ${person}`);
    });

    let options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            text: response.join('\n')
        }
    };

    return send(options, command, installation, isPrivate);
}