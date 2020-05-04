const functions = require('firebase-functions');

const admin = require('../lib/admin');
const createConfig = require('../lib/config');
const {
    sendNextUp,
    sendRequestSet,
    sendRotation,
    sendSetHelp
} = require('../responders/rotate');

module.exports = functions.database.ref('commands/rotate/{id}').onCreate(async (snapshot, context) => {
    if (!snapshot.exists()) {
        return 'Nothing to do for deletion of processed commands.';
    }

    // Start by deleting the command itself from the queue
    await snapshot.ref.remove();

    const command = snapshot.val();

    const installationRef = admin.database().ref('installations').child(command.team_id);
    const installation = (await installationRef.once('value')).val();

    const config = createConfig(command, installation, functions.config());

    const rotationRef = admin.database().ref(`rotations/${config.teamId}-${config.channelId}`);
    const rotationData = await rotationRef.once('value');
    
    if (/list/.test(command.text)) {
        if (!rotationData.exists()) {
            return sendRequestSet(config);
        }

        const rotation = rotationData.val();

        await sendRotation(rotation.people, config, true);
    }
    else if (/next/.test(command.text)) {
        if (!rotationData.exists()) {
            return sendRequestSet(config);
        }

        const rotation = rotationData.val();

        if (!rotation.people || !rotation.people.length) {
            return sendRequestSet(config);
        }

        await sendNextUp(rotation.people[0], config, true);
    }
    else if (/^set/.test(command.text)) {
        const peopleMatch = /^set(.*)/.exec(command.text);

        if (peopleMatch.length < 2 || peopleMatch[1] == null) {
            return sendSetHelp(config);
        }

        const people = peopleMatch[1].trim();
        const peopleList = people.split(',')
            .map(person => person.trim()) // clean up
            .filter(person => !!person); // remove any blanks

        await rotationRef.set({
            people: peopleList
        });

        await sendRotation(peopleList, config, true);
    }
    else if (/^add/.test(command.text)) {
        let peopleMatch = /^add(.*)/.exec(command.text);

        if (peopleMatch.length < 2 || peopleMatch[1] == null) {
            return sendSetHelp(config);
        }

        let people = peopleMatch[1].trim();
        let peopleList = people.split(',')
            .map(person => person.trim()) // clean up
            .filter(person => !!person); // remove any blanks

        if (rotationData.exists()) {
            let rotation = rotationData.val();
            peopleList = (rotation.people || []).concat(peopleList);
        }

        await rotationRef.set({
            people: peopleList
        });

        await sendRotation(peopleList, config, true);
    }
    else {
        await sendSetHelp(config);
    }
});