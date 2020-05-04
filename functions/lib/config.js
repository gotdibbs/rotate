module.exports = function createConfig(command, installation, functionConfig) {
    return {
        // Default response method
        responseUrl: command.response_url,
        // Legacy response method
        webhookUrl: installation[command.channel_id || command.channel.id].url,
        // Response Details
        teamId: command.team_id || command.team.id,
        channelId: command.channel_id || command.channel.id,
        userId: command.user_id || command.user.id,
        scope: installation.scope
    };
}