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
            const instituteStatus = "";
  
            
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

  
  exports.login = async (req, res) => {
    let data = '';

    req.on('data', chunk => {
        data += chunk;
    });

    req.on('end', async () => {
        try {
            const { userType, username, userId, password } = JSON.parse(data);

            if (userType === 'institute') {
                const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
                const instituteResult = await db.query(instituteQuery, [username]);
                if (instituteResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Institute ID does not exist' }));
                }

                const hashedPassword = instituteResult.rows[0].password;
                const passwordMatch = await bcrypt.compare(password, hashedPassword);
                console.log("passwordpassword",password,hashedPassword);
                if (!passwordMatch) {
                    return res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Password is wrong' }));
                }

                // Generate a new token
                const token = generateToken();

                // Update the token in the database
                const updateTokenQuery = 'UPDATE institutes SET token = $1 WHERE username = $2';
                await db.query(updateTokenQuery, [token, username]);

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Login successful', token }));
            } else if (userType === 'student') {
                // Similar logic as above, but for students
            } else {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid login type' }));
            }
        } catch (error) {
            console.error('Error parsing request body:', error);
            return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
    });
};


function generateToken() {
    return uuidv4();
}

exports.recoverPassword = async (req, res) => {
    let data = '';

    req.on('data', chunk => {
        data += chunk;
    });

    req.on('end', async () => {
        try {
            const { accountType, instituteId, userId, email, phone, newPassword } = JSON.parse(data);

            if (accountType === 'institute') {
                // Check if instituteId exists
                const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
                const instituteResult = await db.query(instituteQuery, [instituteId]);
                if (instituteResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Institute ID not found' }));
                }

                // Check if institute status is Active
                const instituteStatus = instituteResult.rows[0].instituteStatus;
                // console.log('instituteResultinstituteResult',instituteResult);
                if (instituteStatus !== 'Active') {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Contact IT department' }));
                }

                // Match email
                const instituteEmail = instituteResult.rows[0].email;
                if (email !== instituteEmail) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email not registered with username' }));
                }

                // Update password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateQuery = 'UPDATE institutes SET password = $1 WHERE institute_id = $2';
                await db.query(updateQuery, [hashedPassword, instituteId]);

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Password changed successfully' }));
            } else if (accountType === 'user') {
                const userQuery = 'SELECT * FROM users WHERE userName = $1';
                const userResult = await db.query(userQuery, [userId]);
                if (userResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'User not found' }));
                }

                // Check if user's institute is active
                const instituteId = userResult.rows[0].institute_id_c;
                const instituteQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
                const instituteResult = await db.query(instituteQuery, [instituteId]);
                const instituteStatus = instituteResult.rows[0].instituteStatus;
                if (instituteStatus !== 'Active') {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Your institute is not active' }));
                }

                // Match email
                const userEmail = userResult.rows[0].email;
                if (email !== userEmail) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email not registered with this user' }));
                }

                // Update password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateQuery = 'UPDATE users SET password = $1 WHERE user_id = $2';
                await db.query(updateQuery, [hashedPassword, userId]);

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Password changed successfully' }));
                
            } else {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid account type' }));
            }
        } catch (error) {
            console.error('Error processing request:', error);
            return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    });
};




  
