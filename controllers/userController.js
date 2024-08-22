const db = require("../config/db");
const {} = require("../Global");

exports.getUserCategoryData = async (req, res) => {
  try {
    const { instituteID, userType, userCategory, userId } = req.body;

    // Check if instituteID exists
    const instituteQuery =
      "SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [instituteID]);
    console.log("instituteResult", instituteResult);
    if (instituteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No institute found with the provided ID" });
    }

    const instituteStatus = instituteResult.rows[0].institute_status;

    // Check institute status
    if (instituteStatus !== "Active") {
      return res
        .status(400)
        .json({
          message: "Please contact the institute for further information",
        });
    }

    if (userType === "institute") {
      let userDataQuery = "";
      const queryParams = [instituteID, userId];

      if (userCategory === "student") {
        userDataQuery = `SELECT
                u.username,
                u.email AS email,
                u.phone_no AS phone_no,
                u.user_status AS user_status,
                u.role_type AS role_type,
                s."name" AS student_name,
                s.gender AS gender,
                s.entered_date,
                s.address AS address,
                i.institute_name AS institute_name,
                i.address AS institute_address,
                f.amount AS amount,
                f.description AS description,
                cm.master_course_name AS course_name,
                c.course_status AS course_status,
                c.entered_date AS course_enrolled_date
            FROM
                users u
            JOIN
                students s ON s.users_id_c = u.user_id
            JOIN
                fees f ON f.user_id_c = u.user_id
            JOIN
                institutes i ON i.institute_id = s.institute_id_c
            JOIN
                courses c ON c.user_id_c = u.user_id
            JOIN
                course_master cm ON c.master_course_id_c = cm.master_course_id
            WHERE
                u.role_type = 'student'
                AND u.institute_id_c = $1
                AND s.student_id = $2`;
      } else if (userCategory === "teacher") {
        userDataQuery = `SELECT
                u.username,
                u.email AS email,
                u.phone_no AS phone_no,
                u.user_status AS user_status,
                u.role_type AS role_type,
                t."name" AS teacher_name,
                t.gender AS gender,
                t.dob AS dob,
                t.entered_date AS enterdate,
                t.address AS address,
                i.institute_name AS institute_name,
                i.address AS institute_address,
                cm.master_course_name AS course_name,
                c.course_status AS course_status,
                c.experiance AS experience,
                c.entered_date AS course_assigned_date
            FROM
                users u
            JOIN
                teachers t ON t.users_id_c = u.user_id
            JOIN
                institutes i ON i.institute_id = t.institute_id_c
            JOIN
                courses c ON c.user_id_c = u.user_id
            JOIN
                course_master cm ON c.master_course_id_c = cm.master_course_id
            WHERE
                u.role_type = 'teacher'
                AND u.institute_id_c = $1
                AND t.teacher_id = $2;
            `;
      } else {
        return res.status(400).json({ message: "Invalid user category" });
      }

      const userDataResult = await db.query(userDataQuery, queryParams);
      const userData = userDataResult.rows;

      return res
        .status(200)
        .json({ message: "User data fetched successfully", userData });
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const { instituteID, userID, userType } = req.body;

    // Check if instituteID exists
    const instituteQuery =
      "SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [instituteID]);

    if (instituteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No institute found with the provided ID" });
    }

    const instituteStatus = instituteResult.rows[0].institute_status;

    // Check institute status
    if (instituteStatus !== "Active") {
      return res
        .status(400)
        .json({
          message: "Please contact the institute for further information",
        });
    }

    if (userType === "user") {
      // Check if userID exists in the institute
      const userQuery =
        "SELECT user_status FROM users WHERE user_id = $1 AND institute_id_c = $2";
      const userResult = await db.query(userQuery, [userID, instituteID]);

      if (userResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "User ID not found in this institute" });
      }

      const userStatus = userResult.rows[0].user_status;

      // Check user status
      if (userStatus !== "Active") {
        return res.status(400).json({ message: "Your ID is blocked" });
      }

      // Fetch all details of the user
      const userDataQuery = `SELECT 
                u.username,
                u.email,
                u.phone_no,
                u.user_status,
                u.role_type,
                s."name",
                s.gender,
                s.entered_date,
                s.course,
                s.address
            FROM users u
            JOIN students s ON s.users_id_c = u.user_id
            WHERE u.user_id = $1 AND u.institute_id_c = $2`;
      const userDataResult = await db.query(userDataQuery, [
        userID,
        instituteID,
      ]);
      const data = userDataResult.rows;

      return res
        .status(200)
        .json({ message: "User data fetched successfully", data });
    } else {
      // Fetch details of the institute
      const instituteDataQuery = `SELECT
                i.username,
                i.email,
                i.phone_no,
                i.institute_name,
                i.institute_status,
                i.address
            FROM institutes i
            WHERE i.institute_id = $1`;
      const instituteDataResult = await db.query(instituteDataQuery, [
        instituteID,
      ]);
      const data = instituteDataResult.rows;

      return res
        .status(200)
        .json({ message: "Institute data fetched successfully", data });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
