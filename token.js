require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const credentials = JSON.parse(process.env.CREDENTIALS);


// Replace with the code you received from Google
const code = process.env.CODE;
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

oAuth2Client.getToken(code).then(({ tokens }) => {
  const tokenPath = path.join(__dirname, 'token.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokens));
  console.log('Access token and refresh token stored to token.json');
});
