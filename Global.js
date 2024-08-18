const { v4: uuidv4 } = require('uuid');

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
}

const generatePassword = (username, mobileNumber) => {
    const lastFourDigits = mobileNumber.slice(-4);
    return `${username}@${lastFourDigits}`;
};

const generateUsername = (name) => {
    const nameWithoutSpaces = name.replace(/\s+/g, '').toLowerCase();
    const randomDigit = Math.floor(Math.random() * 10); 
    return `${nameWithoutSpaces}${randomDigit}`;
      
  };

  function generateToken() {
    return uuidv4();
}

module.exports = {
    generateOTP,
    generatePassword,
    generateUsername,
    generateToken
};
