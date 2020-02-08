# Rotate

Quick hack of a slack app to run a rotation of people. Installs a command `/rotate` which lets you `set` a rotation, run `next` to iterate through people, and view the `current` status of the rotation.

## Installation
1. Visit https://brotate-707ca.firebaseapp.com/
2. Request / authorize the app for a specific channel

## Development
1. Clone the repo
2. Open your favorite editor (perhaps VS Code?)
3. Ensure you have the `npm` package `firebase-tools` installed globally
4. Run the following from a command prompt to set private configuration variables for your Slack App listing (replace any $token with your actual configuration value):
   - `firebase functions:config:set slack.id=$SLACK_ID`
   - `firebase functions:config:set slack.secret=$SLACK_SECRET`
   - `firebase functions:config:set slack.token=$SLACK_TOKEN`
5. `cd` to the `functions` directory
6. Run `npm install`
7. To deploy, run `firebase deploy`
