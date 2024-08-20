const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'trjack300@gmail.com',
        pass: 'nxtt geex cjrb slbu'
  }
});

const sendPasswordByEmail = async (email, username, password) => {
  const mailOptions = {
      from: 'trjack300@gmail.com',
      to: email,
      subject: 'Your credential',
      text: `Your username is: ${username}.\nYour temporary password is: ${password}. \nPlease change your password after logging in.`,
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log('Password and username sent successfully via email.');
  } catch (error) {
      console.error('Error sending password and username via email:', error);
  }
};

module.exports = {
  sendPasswordByEmail
};