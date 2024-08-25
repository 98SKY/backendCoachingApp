const db = require("../config/db");
const bcrypt = require("bcrypt");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const { sendPasswordByEmail } = require("../services/service");
const { generatePassword, generateUsername } = require("../Global");
const todayDate = new Date().toISOString().split("T")[0];

exports.registerInstitute = async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    std,
    medium,
    course,
    experienceInCourse,
    userType,
    myCoachingId,
    address,
    fee,
  } = req.body;

  try {
    if (userType === "institute") {
      const username = generateUsername(name);

      const usernameQuery = "SELECT * FROM institutes WHERE username = $1";
      const usernameResult = await db.query(usernameQuery, [username]);
      if (usernameResult.rows.length > 0) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const emailQuery = "SELECT * FROM institutes WHERE email = $1";
      const emailResult = await db.query(emailQuery, [email]);
      if (emailResult.rows.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const mobileQuery = "SELECT * FROM institutes WHERE phone_no = $1";
      const mobileResult = await db.query(mobileQuery, [phoneNumber]);
      if (mobileResult.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Mobile number already registered" });
      }

      const password = generatePassword(username, phoneNumber);
      const hashedPassword = await bcrypt.hash(password, 10);
      const instituteId = uuidv4();

      const insertQuery =
        "INSERT INTO institutes (username, email, phone_no, password, institute_name, institute_id, institute_status, address, entered_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)";
      await db.query(insertQuery, [
        username,
        email,
        phoneNumber,
        hashedPassword,
        name,
        instituteId,
        "Active",
        address,
        todayDate,
      ]);

      await sendPasswordByEmail(email, username, password);

      return res
        .status(201)
        .json({ message: "Institute created successfully" });
    } else if (userType === "student") {
      if (
        !name ||
        !email ||
        !phoneNumber ||
        !std ||
        !medium ||
        !course ||
        !myCoachingId
      ) {
        return res.status(400).json({ error: "Missing required data" });
      }

      const coachingQuery = "SELECT * FROM institutes WHERE institute_id = $1";
      const coachingResult = await db.query(coachingQuery, [myCoachingId]);
      if (coachingResult.rows.length === 0) {
        return res.status(400).json({ error: "Coaching ID not found" });
      }

      const emailQuery =
        "SELECT * FROM users WHERE email = $1 and institute_id_c = $2";
      const emailResult = await db.query(emailQuery, [email, myCoachingId]);
      if (emailResult.rows.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const userId = uuidv4();
      const studentId = uuidv4();
      const feeId = uuidv4();
      const username = generateUsername(name);
      const password = generatePassword(username, phoneNumber);
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertUserQuery =
        "INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password, user_status, entered_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
      const insertStudentQuery =
        "INSERT INTO students (student_id, users_id_c, name, std, medium, institute_id_c, address) VALUES ($1, $2, $3, $4, $5, $6, $7)";
      const insertFeeQuery =
        "INSERT INTO fees (fee_id,amount, description, institute_id_c, user_id_c, duration, entered_date) VALUES ($1, $2, $3, $4, $5, $6, $7)";
      const insertStudentCourseQuery =
        "INSERT INTO courses (institute_id_c, user_id_c, course_status, course_id,	entered_date, master_course_id_c) VALUES($1, $2, $3, $4, $5, $6)";

      await db.query(
        insertUserQuery,
        [
          userId,
          username,
          email,
          userType,
          myCoachingId,
          phoneNumber,
          hashedPassword,
          "Active",
        ],
        todayDate
      );
      await db.query(insertStudentQuery, [
        studentId,
        userId,
        name,
        std,
        medium,
        myCoachingId,
        address,
      ]);
      await db.query(insertFeeQuery, [
        feeId,
        fee,
        "Paid",
        myCoachingId,
        userId,
        "6 months",
        todayDate,
      ]);
      for (let courseId of course) {
        const studentCourseId = uuidv4();
        await db.query(insertStudentCourseQuery, [
          myCoachingId,
          userId,
          "Active",
          studentCourseId,
          todayDate,
          courseId,
        ]);
      }
      await sendPasswordByEmail(email, username, password);

      return res.status(201).json({ message: "Student created successfully" });
    } else if (userType === "teacher") {
      if (
        !name ||
        !email ||
        !phoneNumber ||
        !experienceInCourse ||
        !course ||
        !myCoachingId
      ) {
        return res.status(400).json({ error: "Missing required data" });
      }

      const coachingQuery = "SELECT * FROM institutes WHERE institute_id = $1";
      const coachingResult = await db.query(coachingQuery, [myCoachingId]);
      if (coachingResult.rows.length === 0) {
        return res.status(400).json({ error: "Coaching ID not found" });
      }

      const emailQuery =
        "SELECT * FROM users WHERE email = $1 and institute_id_c = $2";
      const emailResult = await db.query(emailQuery, [email, myCoachingId]);
      if (emailResult.rows.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const userId = uuidv4();
      const teacherId = uuidv4();
      const username = generateUsername(name);
      const password = generatePassword(username, phoneNumber);
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertTeacherInUserQuery =
        "INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password, user_status, entered_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
      const insertTeacherQuery =
        "INSERT INTO teachers (teacher_id, users_id_c, name, address, institute_id_c, entered_date) VALUES ($1, $2, $3, $4, $5, $6)";
      const insertTeacherCourseQuery =
        "INSERT INTO courses(institute_id_c, user_id_c, course_status,	course_id,	entered_date, master_course_id_c, experiance) VALUES($1, $2, $3, $4, $5, $6, $7)";

      await db.query(insertTeacherInUserQuery, [
        userId,
        username,
        email,
        userType,
        myCoachingId,
        phoneNumber,
        hashedPassword,
        "Active",
        todayDate,
      ]);
      await db.query(insertTeacherQuery, [
        teacherId,
        userId,
        name,
        address,
        myCoachingId,
        todayDate,
      ]);
      for (let courseId of course) {
        const teacherCourseId = uuidv4();
        await db.query(insertTeacherCourseQuery, [
          myCoachingId,
          userId,
          "Active",
          teacherCourseId,
          todayDate,
          courseId,
          experienceInCourse,
        ]);
      }
      await sendPasswordByEmail(email, username, password);
      return res.status(201).json({ message: "Teacher created successfully" });
    } else {
      return res.status(400).json({ error: "Invalid userType" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.usefulData = async (req, res) => {
  try {
    const query =
      "SELECT institute_id, institute_name FROM institutes WHERE institute_status = $1";
    console.log("queryqueryquery", query);
    const institutes = await db.query(query, ["Active"]);
    console.log("institutesinstitutes", institutes);

    const result = institutes.rows.reduce(
      (acc, { institute_id, institute_name }) => {
        acc[institute_id] = institute_name;
        return acc;
      },
      {}
    );

    res.status(200).json({ message: "Data fetched", result });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUsersByCoachingId = async (req, res) => {
    const { coachingId, userCategory } = req.body;
    let message = "Success";
  
    try {
      // Validate coachingId existence in users table
      const userQuery = "SELECT * FROM users WHERE institute_id_c = $1";
      const userResult = await db.query(userQuery, [coachingId]);
  
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "Coaching ID not found" });
      }
  
      // Validate institute status is Active
      const instituteQuery = "SELECT * FROM institutes WHERE institute_id = $1";
      const instituteResult = await db.query(instituteQuery, [coachingId]);
  
      if (
        instituteResult.rows.length === 0 ||
        instituteResult.rows[0].institute_status !== "Active"
      ) {
        return res.status(400).json({ error: "Institute ID not found or inactive" });
      }
  
      // Define the base query
      let roleTypeQuery = `
        SELECT 
          u.username, 
          u.email, 
          u.phone_no, 
          u.user_status, 
          u.institute_id_c,
          s.name, 
          s.gender, 
          s.entered_date,  
          s.medium, 
          s.address, 
          s.student_id as uuid,
          cm.master_course_name as course,  
          c.course_status,
          c.entered_date as course_enrolled_date
        FROM 
          students s
        JOIN 
          users u ON u.user_id = s.users_id_c
        JOIN 
          courses c ON c.user_id_c = u.user_id
        JOIN 
          course_master cm ON c.master_course_id_c = cm.master_course_id
        WHERE 
          u.role_type = $1
          AND u.institute_id_c = $2
          AND c.institute_id_c = $2 
          AND c.user_id_c = u.user_id;
      `;
  
      if (userCategory === "teacher") {
        roleTypeQuery = `
          SELECT 
            u.username, 
            u.email, 
            u.phone_no, 
            u.user_status, 
            u.institute_id_c,
            t.name,  
            t.address, 
            t.teacher_id as uuid, 
            cm.master_course_name as course,  
            c.course_status,
            c.experiance,
            c.entered_date as course_enrolled_date
          FROM 
            teachers t
          JOIN 
            users u ON u.user_id = t.users_id_c
          JOIN 
            courses c ON c.user_id_c = u.user_id
          JOIN 
            course_master cm ON c.master_course_id_c = cm.master_course_id
          WHERE 
            u.role_type = $1
            AND u.institute_id_c = $2
            AND c.institute_id_c = $2 
            AND c.user_id_c = u.user_id;
        `;
      } else if (userCategory !== "student") {
        return res.status(400).json({ error: "Invalid user category" });
      }
  
      // Execute the query
      const roleTypeResult = await db.query(roleTypeQuery, [userCategory, coachingId]);
  
      if (roleTypeResult.rows.length === 0) {
        return res.status(404).json({ error: "No users found for the given category and institute" });
      }
  
      // Process the results to group courses by user
      const userMap = {};
  
      roleTypeResult.rows.forEach(row => {
        const userId = row.uuid;
        if (!userMap[userId]) {
          userMap[userId] = {
            username: row.username,
            email: row.email,
            phone_no: row.phone_no,
            user_status: row.user_status,
            institute_id_c: row.institute_id_c,
            name: row.name,
            gender: row.gender,
            entered_date: row.entered_date,
            medium: row.medium,
            address: row.address,
            uuid: row.uuid,
            courses: []
          };
        }
        userMap[userId].courses.push({
          course: row.course,
          course_status: row.course_status,
          course_enrolled_date: row.course_enrolled_date
        });
      });
  
      const users = Object.values(userMap);
  
      return res.status(200).json({ message, users });
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  

exports.courseName = async (req, res) => {
  const { coachingId } = req.query;
  let message = "Success";

  try {
    const courseNameQuery = `select cm.master_course_id , cm.master_course_name  from course_master cm where cm.master_course_status = 'Active' and cm.institute_id_c = $1`;
    const courseNameResult = await db.query(courseNameQuery, [coachingId]);
    if (courseNameResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "No courses available for this Institute" });
    } else {
      res.status(200).json({ message, courses: courseNameResult.rows });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
