const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'trjack300@gmail.com',
        pass: 'ubkh bfcf xtdy rgti'
  }
});

const sendPasswordByEmail = async (email, username, password) => {
  const mailOptions = {
      from: 'trjack300@gmail.com',
      to: email,
      subject: 'Your account has been created',
      html: `<h2>Your account has been created successfully!</h2> <p>username is: ${username}</p> <p>password is: ${password}</p>`,
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