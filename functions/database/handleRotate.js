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
    
    if (/current/.test(command.text)) {
        if (!config.exists()) {
            return sendRequestSet(command, installation);
        }

        const rotation = config.val();

        return sendRotation(rotation.people, command, installation);
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

        return sendRotation(rotation.people, command, installation);
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

        return sendRotation(peopleList, command, installation);
    }
    else {
        return sendSetHelp(command, installation);
    }
});

function sendSetHelp(command, installation) {
    const options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            text: 'To set or update the rotation for this channel, try this: "/brotate set Person 1, Person 2, Person 3"'
        }
    };

    return rp(options);
}

function sendRequestSet(command, installation) {
    const options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            text: 'You need to set a rotation first.\nTo set a new rotation, try this: "/brotate set Person 1, Person 2, Person 3"'
        }
    };

    return rp(options);
}

function sendRotation(people, command, installation) {
    let response = [
        ':bear: Hey humans! Here\'s the current rotation:',
        ` - Next up: *${people.shift()}*`
    ];

    people.forEach(person => {
        response.push(` - ${person}`);
    });

    const options = {
        uri: installation[command.channel_id].url,
        method: 'POST',
        json: true,
        body: {
            text: response.join('\n')
        }
    };

    return rp(options);
}