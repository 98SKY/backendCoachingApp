const db = require('../config/db');
const bcrypt = require('bcrypt');
const http = require('http');
const {generateToken} = require('../Global');


exports.login = async (req, res) => {
    console.log('Received request'); // Add this line to confirm function execution

    try {
        // Access the parsed body directly
        const { userType, username, password } = req.body;

        if (!userType || !username || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (userType === 'institute') {
            const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
            const instituteResult = await db.query(instituteQuery, [username]);
            if (instituteResult.rows.length === 0) {
                return res.status(404).json({ error: 'Institute ID does not exist' });
            }

            const hashedPassword = instituteResult.rows[0].password;
            const passwordMatch = await bcrypt.compare(password, hashedPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Password is wrong' });
            }

            const token = generateToken();
            const updateTokenQuery = 'UPDATE institutes SET token = $1 WHERE username = $2';
            await db.query(updateTokenQuery, [token, username]);
            const getInstituteId = instituteResult.rows[0].institute_id;

            return res.status(200).json({ message: 'Login successful', token, getInstituteId });
        } else if (userType === 'user') {
            const userQuery = 'SELECT * FROM users WHERE username = $1';
            const userResult = await db.query(userQuery, [username]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User ID does not exist' });
            }

            const hashedPassword = userResult.rows[0].password;
            const passwordMatch = await bcrypt.compare(password, hashedPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Password is wrong' });
            }

            const token = generateToken();
            const updateTokenQuery = 'UPDATE users SET token = $1 WHERE username = $2';
            await db.query(updateTokenQuery, [token, username]);
            const getInstituteId = userResult.rows[0].institute_id_c;

            return res.status(200).json({ message: 'Login successful', token, getInstituteId });
        } else {
            return res.status(400).json({ error: 'Invalid login type' });
        }
    } catch (error) {
        console.error('Error handling login request:', error);
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
};



exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp, userType } = req.body;

        if (!email || !otp || !userType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let verifyQuery, verifyParams;
        if (userType === 'institute') {
            verifyQuery = 'SELECT * FROM institutes WHERE email = $1 AND authenticate = $2';
            verifyParams = [email, otp];
        } else if (userType === 'student' || userType === 'teacher') {
            verifyQuery = 'SELECT * FROM users WHERE email = $1 AND authenticate = $2';
            verifyParams = [email, otp];
        } else {
            return res.status(400).json({ error: 'Invalid userType' });
        }

        const verifyResult = await db.query(verifyQuery, verifyParams);
        if (verifyResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP verified successfully
        // You can proceed with additional actions here if needed

        return res.status(200).json({ message: 'OTP verified successfully' });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


exports.recoverPassword = async (req, res) => {
    try {
        const { accountType, instituteId, userId, email, phone, newPassword, userCategory, getInstituteIdFromParam } = req.body;

        if (!accountType || !email || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (accountType === 'institute') {
            // Check if instituteId exists
            const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
            const instituteResult = await db.query(instituteQuery, [instituteId]);
            if (instituteResult.rows.length === 0) {
                return res.status(404).json({ error: 'Institute ID not found' });
            }

            // Check if institute status is Active
            const instituteStatus = instituteResult.rows[0].institute_status;
            if (instituteStatus !== 'Active') {
                return res.status(400).json({ error: 'Contact IT department' });
            }

            // Match email
            const instituteEmail = instituteResult.rows[0].email;
            if (email !== instituteEmail) {
                return res.status(400).json({ error: 'Email not registered with username' });
            }

            // Update password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updateQuery = 'UPDATE institutes SET password = $1 WHERE username = $2';
            await db.query(updateQuery, [hashedPassword, instituteId]);

            return res.status(200).json({ message: 'Password changed successfully' });

        } else if (accountType === 'user') {
            // Check if userId exists
            const userQuery = 'SELECT * FROM users WHERE username = $1';
            const userResult = await db.query(userQuery, [userId]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Check if user's institute is active
            const instituteID = instituteId || getInstituteIdFromParam;
            const instituteQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
            const instituteResult = await db.query(instituteQuery, [instituteID]);
            const instituteStatus = instituteResult.rows[0].institute_status;
            if (instituteStatus !== 'Active') {
                return res.status(400).json({ error: 'Contact your institute' });
            }

            // Match email
            const userEmail = userResult.rows[0].email;
            if (email !== userEmail) {
                return res.status(400).json({ error: 'Email not registered with this user' });
            }

            // Update password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updateQuery = 'UPDATE users SET password = $1 WHERE username = $2';
            await db.query(updateQuery, [hashedPassword, userId]);

            return res.status(200).json({ message: 'Password changed successfully' });

        } else {
            return res.status(400).json({ error: 'Invalid account type' });
        }

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

