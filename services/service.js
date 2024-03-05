const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'trjack300@gmail.com', // Your Gmail email address
        pass: 'nxtt geex cjrb slbu'
  }
});

// console.log('Transporter initialized:', transporter);
module.exports = {
  transporter: transporter // Export the transporter
};