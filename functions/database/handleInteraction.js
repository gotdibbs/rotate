const functions = require('firebase-functions');

const admin = require('../lib/admin');
const createConfig = require('../lib/config');
const {
    markInteractionComplete,
    sendRequestSet,
    sendRotation
} = require('../responders/rotate');

module.exports = functions.database.ref('interactions/{id}').onCreate(async (snapshot, context) => {
    if (!snapshot.exists()) {
        return 'Nothing to do for deletion of processed commands.';
    }

    // Start by deleting the command itself from the queue
    await snapshot.ref.remove();

    const interaction = snapshot.val();

    const installationRef = admin.database().ref('installations').child(interaction.team.id);
    const installation = (await installationRef.once('value')).val();

    const config = createConfig(interaction, installation, functions.config());

    const rotationRef = admin.database().ref(`rotations/${interaction.team.id}-${interaction.channel.id}`);
    const rotationData = await rotationRef.once('value');

    if (interaction.type !== 'block_actions' || 
        !interaction.actions ||
        !interaction.actions.length ||
        !rotationData.exists()) {
        return;
    }

    let {
        action_id: action,
        value
    } = interaction.actions[0];

    let rotation = rotationData.val();

    if (action === 'publish') {
        await sendRotation(rotation.people, config, false, true);
    }
    else if (action === 'next') {
        let people = [...rotation.people];

        let next = people.shift();

        people.push(next);

        await rotationRef.set({
            people
        });

        await sendRotation(people, config, true);
    }
    else if (action === 'remove_person') {
        let people = [...rotation.people];
        people.splice(parseInt(value, 10), 1);

        await rotationRef.set({
            people
        });

        if (people.length) {
            await sendRotation(people, config, true);
        }
        else {
            await sendRequestSet(config);
        }
    }
    else { // action === 'ack'
        // Always remove the triggering message when done with an interaction
        await markInteractionComplete(interaction.response_url);
    }
});