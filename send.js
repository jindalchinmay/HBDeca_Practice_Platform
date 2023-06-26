const fs = require('fs');
const path = require('path');
const sendMail = require('./gmail');

function mailVerify(options){

  const main = async () => {

    const messageId = await sendMail(options);
    return messageId;
  };

  main()
    .then((messageId) => console.log('Message sent successfully:', messageId))
    .catch((err) => console.error(err));

}

module.exports = mailVerify;
