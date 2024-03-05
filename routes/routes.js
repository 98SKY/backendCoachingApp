const db = require('../config/db');
const bcrypt = require('bcrypt');
const http = require('http');
const { transporter } = require('../services/service');

// Function to generate a random password
const generatePassword = (username, mobileNumber) => {
    const lastFourDigits = mobileNumber.slice(-4);
    return `${username}@${lastFourDigits}`;
};

// Function to send password via email
const sendPasswordByEmail = async (email, password) => {
  const mailOptions = {
      from: 'trjack300@gmail.com',
      to: email,
      subject: 'Your credential',
      text: `Your temporary credential is: ${password}. Please change your password after logging in.`,
  };

  try {
    console.log("sunilllllllllllll",transporter);
      await transporter.sendMail(mailOptions);
      console.log('Password sent successfully via email.');
  } catch (error) {
      console.error('Error sending password via email:', error);
  }
};

// API endpoint to create a user
exports.createUser = async (req, res) => {
  let data = '';

  req.on('data', chunk => {
      data += chunk;
  });

  req.on('end', async () => {
      try {
          const { username, email, mobileNumber } = JSON.parse(data);

          // Check if username already exists
          const usernameQuery = 'SELECT * FROM users WHERE username = $1';
          const usernameResult = await db.query(usernameQuery, [username]);
          if (usernameResult.rows.length > 0) {
              return res.writeHead(400).end(JSON.stringify({ error: 'Username already exists' }));
          }

          // Check if email already exists
          const emailQuery = 'SELECT * FROM users WHERE email = $1';
          const emailResult = await db.query(emailQuery, [email]);
          if (emailResult.rows.length > 0) {
              return res.writeHead(400).end(JSON.stringify({ error: 'Email already registered' }));
          }

          // Check if mobile number already exists
          const mobileQuery = 'SELECT * FROM users WHERE phone_no = $1';
          const mobileResult = await db.query(mobileQuery, [mobileNumber]);
          if (mobileResult.rows.length > 0) {
              return res.writeHead(400).end(JSON.stringify({ error: 'Mobile number already registered' }));
          }

          // Generate password
          const password = generatePassword(username, mobileNumber);

          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert user into the database
          const insertQuery = 'INSERT INTO users (username, email, phone_no, password) VALUES ($1, $2, $3, $4)';
          try {
              await db.query(insertQuery, [username, email, mobileNumber, hashedPassword]);
              
              // Send password via email
              await sendPasswordByEmail(email, password);

              return res.writeHead(201).end(JSON.stringify({ message: 'User created successfully' }));
          } catch (error) {
              console.error('Error creating user:', error);
              return res.writeHead(500).end(JSON.stringify({ error: 'Internal Server Error' }));
          }
      } catch (error) {
          console.error('Error parsing request body:', error);
          return res.writeHead(400).end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
  });
};




exports.getUserById = async (req, res) => {
  try {
    // Implement get user by ID logic using raw SQL queries
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Add more routes as needed...
