const rp = require('request-promise');

function markInteractionComplete(responseUrl) {
    const request = {
        uri: responseUrl,
        method: 'POST',
        json: true,
        body: {
            delete_original: true
        }
    };

    return rp(request);
}

function send(body, context, isPrivate, isResponse) {
    let request = {
        method: 'POST',
        json: true,
        body: {
            ...body,
            channel: context.channelId,
            response_type: isPrivate ? 'ephemeral' : 'in_channel',
            replace_original: true,
            delete_original: false
        },
        uri: context.responseUrl
    };

    if (isResponse) {
        request.body.replace_original = false;
        request.body.delete_original = true;
    }

    return rp(request);
}

function sendNextUp(person, context, isPrivate) {
    let blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${person}* is up next`
            }
        },
        {
            type: 'actions',
            block_id: 'next_actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Cycle to the next person'
                    },
                    action_id: 'next',
                    value: 'next'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Done'
                    },
                    style: 'primary',
                    action_id: 'ack',
                    value: 'ack'
                }
            ]
        }
    ];

    const body = {
        blocks
    };

    return send(body, context, isPrivate);
}

function sendSetHelp(context) {
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
                text: '`/rotate add Person 3, Person 4`: Adds 1 or more people to the bottom of your rotation'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate list`: Displays the current rotation _but only to you_'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate next`: Shows who is up next'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '`/rotate set Person 1, Person 2`: Sets your rotation, with Person 1 up first'
            }
        },
        {
            type: 'actions',
            block_id: 'help_actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Done'
                    },
                    style: 'primary',
                    action_id: 'ack',
                    value: 'ack'
                }
            ]
        }
    ];

    const body = {
        blocks
    };

    return send(body, context, true);
}

function sendRequestSet(context) {
    const body = {
        blocks: [{
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Your rotation is currently empty.*'
            }
        }, {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'To set a new rotation, try this: `/rotate set Person 1, Person 2, Person 3`'
            }
        }]
    };

    return send(body, context, true);
}

function sendRotation(people, context, isPrivate, isResponse) {
    let blocks = [{
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: 'Here\'s the current rotation:'
        }
    }];

    people.forEach((person, index) => {
        let text = ` ${index + 1}. ${person}`;

        if (index === 0) {
            text = ` 1. Next up: *${person}*`;
        }

        let block = {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text
            }
        };

        if (isPrivate) {
            block.accessory = {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: 'Remove'
                },
                style: 'danger',
                action_id: 'remove_person',
                value: index.toString()
            };
        }

        blocks.push(block);
    });

    if (isPrivate) {
        let actions = {
            type: 'actions',
            block_id: 'rotation_actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Share rotation to channel'
                    },
                    action_id: 'publish',
                    value: 'publish'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Rotate'
                    },
                    action_id: 'next',
                    value: 'next'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Done'
                    },
                    style: 'primary',
                    action_id: 'ack',
                    value: 'ack'
                }
            ]
        }

        blocks.push({
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: 'Press *Rotate* when you are ready to rotate to the next in the list, or *Done* to close this message.'
            }]
        });

        blocks.push(actions);
    }

    const body = {
        blocks
    };

    return send(body, context, isPrivate, isResponse);
}

module.exports = {
    markInteractionComplete,
    sendNextUp,
    sendRequestSet,
    sendRotation,
    sendSetHelp
};