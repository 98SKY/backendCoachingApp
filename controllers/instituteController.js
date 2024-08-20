const db = require('../config/db');
const bcrypt = require('bcrypt');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const {sendPasswordByEmail} = require('../services/service')
const {generatePassword, generateUsername,} = require('../Global');



exports.registerInstitute = async (req, res) => {
    const { name, email, phoneNumber, std, medium, course, experienceInCourse, userType, myCoachingId, address, fee } = req.body;

    try {
        if (userType === 'institute') {
            const username = generateUsername(name);

            const usernameQuery = 'SELECT * FROM institutes WHERE username = $1';
            const usernameResult = await db.query(usernameQuery, [username]);
            if (usernameResult.rows.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const emailQuery = 'SELECT * FROM institutes WHERE email = $1';
            const emailResult = await db.query(emailQuery, [email]);
            if (emailResult.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const mobileQuery = 'SELECT * FROM institutes WHERE phone_no = $1';
            const mobileResult = await db.query(mobileQuery, [phoneNumber]);
            if (mobileResult.rows.length > 0) {
                return res.status(400).json({ error: 'Mobile number already registered' });
            }

            const password = generatePassword(username, phoneNumber);
            const hashedPassword = await bcrypt.hash(password, 10);
            const instituteId = uuidv4();

            const insertQuery = 'INSERT INTO institutes (username, email, phone_no, password, institute_name, institute_id, institute_status, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            await db.query(insertQuery, [username, email, phoneNumber, hashedPassword, name, instituteId, 'Active', address]);

            await sendPasswordByEmail(email, username, password);

            return res.status(201).json({ message: 'Institute created successfully' });

        } else if (userType === 'student') {
            if (!name || !email || !phoneNumber || !std || !medium || !course || !myCoachingId) {
                return res.status(400).json({ error: 'Missing required data' });
            }

            const coachingQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
            const coachingResult = await db.query(coachingQuery, [myCoachingId]);
            if (coachingResult.rows.length === 0) {
                return res.status(400).json({ error: 'Coaching ID not found' });
            }

            const emailQuery = 'SELECT * FROM users WHERE email = $1';
            const emailResult = await db.query(emailQuery, [email]);
            if (emailResult.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const userId = uuidv4();
            const studentId = uuidv4();
            const feeId = uuidv4();
            const username = generateUsername(name);
            const password = generatePassword(username, phoneNumber);
            const hashedPassword = await bcrypt.hash(password, 10);

            const insertUserQuery = 'INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password, user_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            const insertStudentQuery = 'INSERT INTO students (student_id, users_id_c, name, std, medium, institute_id_c, course, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            const insertFeeQuery = 'INSERT INTO fees (fee_id,amount, description, institute_id_c, user_id_c, duration) VALUES ($1, $2, $3, $4, $5, $6)';

            await sendPasswordByEmail(email, username, password);
            await db.query(insertUserQuery, [userId, username, email, userType, myCoachingId, phoneNumber, hashedPassword, 'Active']);
            await db.query(insertStudentQuery, [studentId, userId, name, std, medium, myCoachingId, course, address]);
            await db.query(insertFeeQuery, [feeId, fee, 'Paid', myCoachingId, userId, '6 months']);

            return res.status(201).json({ message: 'Student created successfully' });

        } else if (userType === 'teacher') {
            if (!name || !email || !phoneNumber || !experienceInCourse || !course || !myCoachingId) {
                return res.status(400).json({ error: 'Missing required data' });
            }

            const coachingQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
            const coachingResult = await db.query(coachingQuery, [myCoachingId]);
            if (coachingResult.rows.length === 0) {
                return res.status(400).json({ error: 'Coaching ID not found' });
            }

            const emailQuery = 'SELECT * FROM users WHERE email = $1';
            const emailResult = await db.query(emailQuery, [email]);
            if (emailResult.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const userId = uuidv4();
            const teacherId = uuidv4();
            const username = generateUsername(name);
            const password = generatePassword(username, phoneNumber);
            const hashedPassword = await bcrypt.hash(password, 10);

            const insertTeacherInUserQuery = 'INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password, user_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            const insertTeacherQuery = 'INSERT INTO teachers (teacher_id, users_id_c, name, experiance, address, institute_id_c, course) VALUES ($1, $2, $3, $4, $5, $6, $7)';

            await sendPasswordByEmail(email, username, password);
            await db.query(insertTeacherInUserQuery, [userId, username, email, userType, myCoachingId, phoneNumber, hashedPassword, 'Active']);
            await db.query(insertTeacherQuery, [teacherId, userId, name, experienceInCourse, address, myCoachingId, course]);

            return res.status(201).json({ message: 'Teacher created successfully' });

        } else {
            return res.status(400).json({ error: 'Invalid userType' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.usefulData = async (req, res) => {
    try {
        const query = 'SELECT institute_id, institute_name FROM institutes WHERE institute_status = $1';
        console.log('queryqueryquery', query);
        const institutes = await db.query(query, ['Active']);
        console.log('institutesinstitutes', institutes);
        
        const result = institutes.rows.reduce((acc, { institute_id, institute_name }) => {
            acc[institute_id] = institute_name;
            return acc;
        }, {});
        
        res.status(200).json({ message: 'Data fetched', result });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getUsersByCoachingId = async (req, res) => {
    const { coachingId, userCategory, userType } = req.body;
    let message = 'Success';

    try {
        // Check if coachingId exists in users table
        const userQuery = 'SELECT * FROM users WHERE institute_id_c = $1';
        const userResult = await db.query(userQuery, [coachingId]);
        if (userResult.rows.length === 0 && userType !== 'institute') {
            return res.status(404).json({ error: 'Coaching ID not found' });
        }

        // Check if institute status is Active
        const instituteQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
        const instituteResult = await db.query(instituteQuery, [coachingId]);
        if (instituteResult.rows.length === 0 || instituteResult.rows[0].institute_status !== 'Active') {
            return res.status(400).json({ error: 'Institute ID not found or inactive' });
        }

        // Check user category or user type
        let roleTypeQuery = '';

        if (userCategory === 'student') {
            roleTypeQuery = `
                SELECT u.username, u.email, u.phone_no, u.user_status, s.name, s.gender, s.entered_date, s.course, s.medium, s.address, s.student_id as uuid
                FROM students s
                JOIN users u ON u.user_id = s.users_id_c
                WHERE u.role_type = $1 AND u.institute_id_c = $2
            `;
        } else if (userCategory === 'teacher') {
            roleTypeQuery = `
                SELECT u.username, u.email, u.phone_no, u.user_status, t.name, t.gender, t.dob, t.entered_date, t.course, t.address, t.teacher_id as uuid
                FROM teachers t
                JOIN users u ON u.user_id = t.users_id_c
                WHERE u.role_type = $1 AND u.institute_id_c = $2
            `;
        } else {
            return res.status(400).json({ error: 'Invalid user category or type' });
        }

        const roleTypeResult = await db.query(roleTypeQuery, [userCategory, coachingId]);
        return res.status(200).json({ message, users: roleTypeResult.rows });
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


