const db = require('../config/db');
const bcrypt = require('bcrypt');
const http = require('http');
const { transporter } = require('../services/service');
const { v4: uuidv4 } = require('uuid');

const generatePassword = (username, mobileNumber) => {
    const lastFourDigits = mobileNumber.slice(-4);
    return `${username}@${lastFourDigits}`;
};



exports.registerInstitute = async (req, res) => {
    let data = '';
  
    req.on('data', chunk => {
        data += chunk;
    });
  
    req.on('end', async () => {
        try {
            const { instituteName, emailId, phoneNumber } = JSON.parse(data);
  
            
            const username = generateUsername(instituteName);
  
            
            const usernameQuery = 'SELECT * FROM institutes WHERE username = $1';
            const usernameResult = await db.query(usernameQuery, [username]);
            if (usernameResult.rows.length > 0) {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Username already exists' }));
            }
  
            
            const emailQuery = 'SELECT * FROM institutes WHERE email = $1';
            const emailResult = await db.query(emailQuery, [emailId]);
            if (emailResult.rows.length > 0) {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email already registered' }));
            }
  
            
            const mobileQuery = 'SELECT * FROM institutes WHERE phone_no = $1';
            const mobileResult = await db.query(mobileQuery, [phoneNumber]);
            if (mobileResult.rows.length > 0) {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Mobile number already registered' }));
            }
  
            
            const password = generatePassword(username, phoneNumber);
  
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const instituteId = uuidv4();
  
            
            const insertQuery = 'INSERT INTO institutes (username, email, phone_no, password, institute_name,institute_id) VALUES ($1, $2, $3, $4, $5, $6)';
            try {
                await db.query(insertQuery, [username, emailId, phoneNumber, hashedPassword, instituteName,instituteId]);
                
                
                await sendPasswordByEmail(emailId, username, password);
  
                
                return res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'User created successfully' }));

            } catch (error) {
                console.error('Error creating user:', error);
                return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        } catch (error) {
            console.error('Error parsing request body:', error);
            return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
    });
  };
  
  
  const generateUsername = (instituteName) => {
      
      return instituteName.replace(/\s+/g, '').toLowerCase(); 
  };
  
  
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
  
