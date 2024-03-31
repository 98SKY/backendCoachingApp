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
            const { name, email, phoneNumber, std, medium, course, experienceInCourse, userType, myCoachingId, address } = JSON.parse(data);
            //  console.log('dataaaaa',JSON.parse(data));
            if (userType === 'institute') {
                const username = generateUsername(name);

                const usernameQuery = 'SELECT * FROM institutes WHERE username = $1';
                const usernameResult = await db.query(usernameQuery, [username]);
                if (usernameResult.rows.length > 0) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Username already exists' }));
                }

                const emailQuery = 'SELECT * FROM institutes WHERE email = $1';
                const emailResult = await db.query(emailQuery, [email]);
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

                const insertQuery = 'INSERT INTO institutes (username, email, phone_no, password, institute_name, institute_id, institute_status, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
                try {
                    await db.query(insertQuery, [username, email, phoneNumber, hashedPassword, name, instituteId, "Active",address ]);

                    await sendPasswordByEmail(email, username, password);

                    return res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'User created successfully' }));

                } catch (error) {
                    console.error('Error creating user:', error);
                    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
                }
            } else if (userType === 'student') {
                if (!name || !email || !phoneNumber || !std || !medium || !course || !myCoachingId) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing required data' }));
                }

                const coachingQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
                const coachingResult = await db.query(coachingQuery, [myCoachingId]);
                if (coachingResult.rows.length === 0) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Coaching ID not found' }));
                }

                const emailQuery = 'SELECT * FROM users WHERE email = $1';
                const emailResult = await db.query(emailQuery, [email]);
                if (emailResult.rows.length > 0) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email already registered' }));
                }

                const userId = uuidv4();
                const studentId = uuidv4();
                const username = generateUsername(name);
                const password = generatePassword(username, phoneNumber);
                const hashedPassword = await bcrypt.hash(password, 10);

                const insertUserQuery = 'INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password,user_status) VALUES ($1, $2, $3, $4, $5,$6, $7,$8)';
                const insertStudentQuery = 'INSERT INTO students (student_id,users_id_c, name, std, medium, institute_id_c, course, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
                try {
                    
                    await db.query(insertUserQuery, [userId, username, email, userType, myCoachingId, phoneNumber,hashedPassword,'Active']);
                    await db.query(insertStudentQuery, [studentId,userId, name,  std, medium, myCoachingId, course, address]);
                    await sendPasswordByEmail(email,username,password);
                    return res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Student created successfully' }));

                } catch (error) {
                    console.error('Error creating user:', error);
                    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
                    
                }



            } else if (userType === 'teacher') {
                if (!name || !email || !phoneNumber || !experienceInCourse  || !course || !myCoachingId) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing required data' }));
                }
                const coachingQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
                const coachingResult = await db.query(coachingQuery, [myCoachingId]);
                if (coachingResult.rows.length === 0) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Coaching ID not found' }));
                }

                const emailQuery = 'SELECT * FROM users WHERE email = $1';
                const emailResult = await db.query(emailQuery, [email]);
                if (emailResult.rows.length > 0) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email already registered' }));
                }

                const userId = uuidv4();
                const teacherId = uuidv4();
                const username = generateUsername(name);
                const password = generatePassword(username, phoneNumber);
                const hashedPassword = await bcrypt.hash(password, 10);

                const insertTeacherInUserQuery = 'INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password,user_status) VALUES ($1, $2, $3, $4, $5,$6, $7,$8)';
                const insertTeacherQuery = 'INSERT INTO teachers (teacher_id,users_id_c, name, experiance, address, institute_id_c, course) VALUES ($1, $2, $3, $4, $5, $6, $7)';
                try {
                    
                    await db.query(insertTeacherInUserQuery, [userId, username, email, userType, myCoachingId, phoneNumber,hashedPassword,'Active']);
                    await db.query(insertTeacherQuery, [teacherId,userId, name, experienceInCourse,address, myCoachingId, course]);
                    await sendPasswordByEmail(email,username,password);
                    return res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Teacher id created successfully' }));

                } catch (error) {
                    console.error('Error creating user:', error);
                    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
                    
                }
            } else {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid userType' }));
            }
        } catch (error) {
            console.error('Error:', error);
            return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    });
};



  const generateUsername = (name) => {
    const nameWithoutSpaces = name.replace(/\s+/g, '').toLowerCase();
    const randomDigit = Math.floor(Math.random() * 10); 
    return `${nameWithoutSpaces}${randomDigit}`;
      
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
            const { userType, username, password } = JSON.parse(data);

            if (userType === 'institute') {
                const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
                const instituteResult = await db.query(instituteQuery, [username]);
                if (instituteResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Institute ID does not exist' }));
                }

                const hashedPassword = instituteResult.rows[0].password;
                const passwordMatch = await bcrypt.compare(password, hashedPassword);
                // console.log("passwordpassword",password,hashedPassword);
                if (!passwordMatch) {
                    return res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Password is wrong' }));
                }

                // Generate a new token
                const token = generateToken();
                
                // Update the token in the database
                const updateTokenQuery = 'UPDATE institutes SET token = $1 WHERE username = $2';
                await db.query(updateTokenQuery, [token, username]);
                const getInstituteId = instituteResult.rows[0].institute_id;
                // console.log('getInstituteIdgetInstituteId',getInstituteId);

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Login successful', token,getInstituteId }));
            } else if (userType === 'user') {
                
                // Similar logic as above, but for students
                const userQuery = 'SELECT * FROM users WHERE username = $1';
                const userResult = await db.query(userQuery, [username]);
                if (userResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'User ID does not exist' }));
                }

                const hashedPassword = userResult.rows[0].password;
                const passwordMatch = await bcrypt.compare(password, hashedPassword);
                // console.log("passwordpassword",password,hashedPassword);
                if (!passwordMatch) {
                    return res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Password is wrong' }));
                }

                // Generate a new token
                const token = generateToken();

                // Update the token in the database
                const updateTokenQuery = 'UPDATE users SET token = $1 WHERE username = $2';
                await db.query(updateTokenQuery, [token, username]);
                const getInstituteId = userResult.rows[0].institute_id_c;

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Login successful', token,getInstituteId }));
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
            const { accountType, instituteId, userId, email, phone, newPassword,userCategory,getInstituteIdFromParam} = JSON.parse(data);

            if (accountType === 'institute') {
                // Check if instituteId exists
                const instituteQuery = 'SELECT * FROM institutes WHERE username = $1';
                const instituteResult = await db.query(instituteQuery, [instituteId]);
                if (instituteResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Institute ID not found' }));
                }

                // Check if institute status is Active
                const instituteStatus = instituteResult.rows[0].institute_status;
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
                // console.log('hashedPasswordhashedPassword',hashedPassword);
                const updateQuery = 'UPDATE institutes SET password = $1 WHERE username = $2';
                await db.query(updateQuery, [hashedPassword, instituteId]);

                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Password changed successfully' }));
            } else if (accountType === 'user') {
                const userQuery = 'SELECT * FROM users WHERE username = $1';
                const userResult = await db.query(userQuery, [userId]);
                if (userResult.rows.length === 0) {
                    return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'User not found' }));
                }

                // Check if user's institute is active
                const instituteID = instituteId || getInstituteIdFromParam;
                const instituteQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
                const instituteResult = await db.query(instituteQuery, [instituteID]);
                const instituteStatus = instituteResult.rows[0].institute_status;
                if (instituteStatus !== 'Active') {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Contact to your institute' }));
                }

                // Match email
                const userEmail = userResult.rows[0].email;
                if (email !== userEmail) {
                    return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Email not registered with this user' }));
                }

                // Update password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateQuery = 'UPDATE users SET password = $1 WHERE username = $2';
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

exports.usefulData = async (res) => {
    try {
        
        const query = 'SELECT institute_id, institute_name FROM institutes WHERE institute_status = $1';
        console.log('queryqueryquery',query);
        const institutes = await db.query(query, ['Active']);
        console.log('institutesinstitutes',institutes);
        
        const result = institutes?.rows.reduce((acc, { institute_id, institute_name }) => {
            acc[institute_id] = institute_name;
            return acc;
        }, {});

        
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({message: 'data fetched',result}));
    } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
    }
};

exports.getUsersByCoachingId = async (req, res) => {
    let data = '';
    let message='success';

    req.on('data', chunk => {
        data += chunk;
    });

    req.on('end', async () => {
        try {
            const { coachingId, userCategory, userType } = JSON.parse(data);
            // console.log('i am here ');

            // Check if coachingId exists in users table
            const userQuery = 'SELECT * FROM users WHERE institute_id_c = $1';
            const userResult = await db.query(userQuery, [coachingId]);
            if (userResult.rows.length === 0 && !userType == 'institute') {
                return res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Coaching ID not found' }));
            }

            // Check if institute status is Active
            const instituteQuery = 'SELECT * FROM institutes WHERE institute_id = $1';
            const instituteResult = await db.query(instituteQuery, [coachingId]);
            if (instituteResult.rows.length === 0 || instituteResult.rows[0].institute_status !== 'Active') {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Institute ID not found or inactive' }));
            }

            // Check user category or user type
            let roleTypeQuery = '';
            
            if (userCategory === 'student') {
                roleTypeQuery = `SELECT u.username, u.email, u.phone_no, u.user_status, s.name, s.gender, s.dob, s.enterdate, s.course, s.medium, s.address, s.student_id as uuid FROM students s JOIN users u ON u.user_id = s.users_id_c WHERE u.role_type = '${userCategory}' AND u.institute_id_c = '${coachingId}'`;
                // console.log('roleTypeQueryroleTypeQuery',roleTypeQuery);
                
            } else if (userCategory === 'teacher') {
                roleTypeQuery = `SELECT u.username, u.email, u.phone_no, u.user_status, t.name, t.gender, t.dob, t.enterdate, t.course, t.address, t.teacher_id as uuid FROM teachers t JOIN users u ON u.user_id = t.users_id_c WHERE u.role_type = '${userCategory}' AND u.institute_id_c = '${coachingId}'`;
                console.log('roleTypeQueryroleTypeQuery',roleTypeQuery);
                
            } else {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid user category or type' }));
            }

            // console.log("roleTypeResult",roleTypeQuery);
            const roleTypeResult = await db.query(roleTypeQuery);
    
            return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: message,users: roleTypeResult.rows }));
        } catch (error) {
            // console.error('Error processing request:', error);
            return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    });
};






  
