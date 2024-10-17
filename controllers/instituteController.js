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

  if (!name || !email || !phoneNumber || !userType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    switch (userType) {
      case "institute":
        await handleInstituteRegistration(
          { name, email, phoneNumber, address },
          res
        );
        break;
      case "student":
        await handleStudentRegistration(
          {
            name,
            email,
            phoneNumber,
            std,
            medium,
            course,
            myCoachingId,
            address,
            fee,
          },
          res
        );
        break;
      case "teacher":
        await handleTeacherRegistration(
          {
            name,
            email,
            phoneNumber,
            course,
            experienceInCourse,
            myCoachingId,
            address,
          },
          res
        );
        break;
      default:
        return res.status(400).json({ error: "Invalid userType" });
    }
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

async function handleInstituteRegistration(
  { name, email, phoneNumber, address },
  res
) {
  const username = generateUsername(name);

  if (await isUserExists("institutes", { username, email, phoneNumber })) {
    return res
      .status(400)
      .json({ error: "Username, email, or phone number already registered" });
  }

  const password = generatePassword(username, phoneNumber);
  const hashedPassword = await bcrypt.hash(password, 10);
  const instituteId = uuidv4();

  const insertQuery = `
    INSERT INTO institutes (username, email, phone_no, password, institute_name, institute_id, institute_status, address, entered_date)
    VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, NOW())
  `;
  await db.query(insertQuery, [
    username,
    email,
    phoneNumber,
    hashedPassword,
    name,
    instituteId,
    address,
  ]);

  await sendPasswordByEmail(email, username, password);
  res.status(201).json({ message: "Institute created successfully" });
}

async function handleStudentRegistration(
  { name, email, phoneNumber, std, medium, course, myCoachingId, address, fee },
  res
) {
  if (!std || !medium || !course || !myCoachingId) {
    return res.status(400).json({ error: "Missing required student data" });
  }

  if (!(await isRecordExists("institutes", "institute_id", myCoachingId))) {
    return res.status(400).json({ error: "Coaching ID not found" });
  }

  if (await isUserExists("users", { email, institute_id_c: myCoachingId })) {
    return res.status(400).json({ error: "Email already registered" });
  }

  await db.query("BEGIN");
  try {
    const userId = uuidv4();
    const studentId = uuidv4();
    const feeId = uuidv4();
    const username = generateUsername(name);
    const password = generatePassword(username, phoneNumber);
    const hashedPassword = await bcrypt.hash(password, 10);

    await createUser({
      userId,
      username,
      email,
      userType: "student",
      instituteId: myCoachingId,
      phoneNumber,
      hashedPassword,
    });
    await createStudent({
      studentId,
      userId,
      name,
      std,
      medium,
      myCoachingId,
      address,
    });
    await createFee({
      feeId,
      amount: fee,
      myCoachingId,
      userId,
      duration: "6 months",
    });
    await createCourses(course, myCoachingId, userId);

    await db.query("COMMIT");
    await sendPasswordByEmail(email, username, password);
    res.status(201).json({ message: "Student created successfully" });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error during student registration:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function handleTeacherRegistration(
  {
    name,
    email,
    phoneNumber,
    course,
    experienceInCourse,
    myCoachingId,
    address,
  },
  res
) {
  if (!course || !experienceInCourse || !myCoachingId) {
    return res.status(400).json({ error: "Missing required teacher data" });
  }

  if (!(await isRecordExists("institutes", "institute_id", myCoachingId))) {
    return res.status(400).json({ error: "Coaching ID not found" });
  }

  if (await isUserExists("users", { email, institute_id_c: myCoachingId })) {
    return res.status(400).json({ error: "Email already registered" });
  }

  await db.query("BEGIN");
  try {
    const userId = uuidv4();
    const teacherId = uuidv4();
    const username = generateUsername(name);
    const password = generatePassword(username, phoneNumber);
    const hashedPassword = await bcrypt.hash(password, 10);

    await createUser({
      userId,
      username,
      email,
      userType: "teacher",
      myCoachingId,
      phoneNumber,
      hashedPassword,
    });
    await createTeacher({ teacherId, userId, name, myCoachingId, address });
    await createCourses(course, myCoachingId, userId, experienceInCourse);
    await db.query("COMMIT");
    await sendPasswordByEmail(email, username, password);
    res.status(201).json({ message: "Teacher created successfully" });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error during teacher registration:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function isUserExists(table, criteria) {
  const whereClause = Object.keys(criteria)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(" AND ");
  const values = Object.values(criteria);
  const query = `SELECT 1 FROM ${table} WHERE ${whereClause}`;
  const result = await db.query(query, values);
  return result.rows.length > 0;
}

async function isRecordExists(table, column, value) {
  const query = `SELECT 1 FROM ${table} WHERE ${column} = $1`;
  const result = await db.query(query, [value]);
  return result.rows.length > 0;
}

async function createUser({
  userId,
  username,
  email,
  userType,
  instituteId,
  phoneNumber,
  hashedPassword,
}) {
  const query = `
    INSERT INTO users (user_id, username, email, role_type, institute_id_c, phone_no, password, user_status, entered_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', NOW())
  `;
  await db.query(query, [
    userId,
    username,
    email,
    userType,
    instituteId,
    phoneNumber,
    hashedPassword,
  ]);
}

async function createStudent({
  studentId,
  userId,
  name,
  std,
  medium,
  myCoachingId,
  address,
}) {
  const query = `
    INSERT INTO students (student_id, users_id_c, name, std, medium, institute_id_c, address)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await db.query(query, [
    studentId,
    userId,
    name,
    std,
    medium,
    myCoachingId,
    address,
  ]);
}

async function createFee({ feeId, amount, myCoachingId, userId, duration }) {
  const query = `
    INSERT INTO fees (fee_id, amount, description, institute_id_c, user_id_c, duration, entered_date)
    VALUES ($1, $2, 'Paid', $3, $4, $5, NOW())
  `;
  await db.query(query, [feeId, amount, myCoachingId, userId, duration]);
}

async function createCourses(
  course,
  instituteId,
  userId,
  experienceInCourse = 0
) {
  for (let courseId of course) {
    const studentCourseId = uuidv4();
    const query = `
      INSERT INTO courses (institute_id_c, user_id_c, course_status, course_id, entered_date, master_course_id_c, experiance)
      VALUES ($1, $2, 'Active', $3, NOW(), $4, $5)
    `;
    await db.query(query, [
      instituteId,
      userId,
      studentCourseId,
      courseId,
      experienceInCourse,
    ]);
  }
}

async function createTeacher({
  teacherId,
  userId,
  name,
  myCoachingId,
  address,
}) {
  const query = `
    INSERT INTO teachers (teacher_id, users_id_c, name, institute_id_c, address)
    VALUES ($1, $2, $3, $4, $5)
  `;
  await db.query(query, [teacherId, userId, name, myCoachingId, address]);
}

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
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  let message = "Success";

  try {
    const userQuery = "SELECT * FROM users WHERE institute_id_c = $1";
    const userResult = await db.query(userQuery, [coachingId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Coaching ID not found" });
    }

    const instituteQuery = "SELECT * FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [coachingId]);

    if (
      instituteResult.rows.length === 0 ||
      instituteResult.rows[0].institute_status !== "Active"
    ) {
      return res
        .status(400)
        .json({ error: "Institute ID not found or inactive" });
    }

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
          AND c.user_id_c = u.user_id
        LIMIT $3 OFFSET $4;
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
            AND c.user_id_c = u.user_id
          LIMIT $3 OFFSET $4;
        `;
    } else if (userCategory !== "student") {
      return res.status(400).json({ error: "Invalid user category" });
    }

    const roleTypeResult = await db.query(roleTypeQuery, [
      userCategory,
      coachingId,
      limit,
      offset,
    ]);

    if (roleTypeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No users found for the given category and institute" });
    }

    const userMap = {};

    roleTypeResult.rows.forEach((row) => {
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
          courses: [],
        };
      }
      userMap[userId].courses.push({
        course: row.course,
        course_status: row.course_status,
        course_enrolled_date: row.course_enrolled_date,
      });
    });

    const users = Object.values(userMap);

    return res.status(200).json({ message, users, page, limit });
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
