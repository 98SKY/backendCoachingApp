const db = require("../config/db");
const {} = require("../Global");

exports.getUserCategoryData = async (req, res) => {
  try {
    const { instituteID, userType, userCategory, userId } = req.body;

    const instituteQuery =
      "SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [instituteID]);
    if (instituteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No institute found with the provided ID" });
    }

    const instituteStatus = instituteResult.rows[0].institute_status;
    if (instituteStatus !== "Active") {
      return res.status(400).json({
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

      // Structure the response for a single user object
      if (userData.length > 0) {
        const courses = userData.map((course) => ({
          course_name: course.course_name,
          course_status: course.course_status,
          course_enrolled_date:
            course.course_enrolled_date || course.course_assigned_date,
          experience: userData[0].experience || null,
        }));

        const response = {
          personalInfo: {
            email: userData[0].email,
            phone_no: userData[0].phone_no,
            address: userData[0].address,
            user_status: userData[0].user_status,
            name: userData[0].student_name || userData[0].teacher_name,
            gender: userData[0].gender,
            dob: userData[0].dob || null,
            entered_date: userData[0].entered_date,
          },
          instituteInfo: {
            institute_name: userData[0].institute_name,
            institute_address: userData[0].institute_address,
            institute_userName: userData[0].username,
            role_type: userData[0].role_type,
            institute_status: userData[0].instituteStatus,
          },
          feeInfo: {
            amount: userData[0].amount || null,
            description: userData[0].description || null,
          },
          studyInfo: {},
          courses: courses,
        };

        return res.status(200).json({
          message: "User data fetched successfully",
          userData: [response],
        });
      } else {
        return res.status(404).json({ message: "User data not found" });
      }
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

    const instituteQuery =
      "SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [instituteID]);

    if (instituteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No institute found with the provided ID" });
    }

    const instituteStatus = instituteResult.rows[0].institute_status;

    if (instituteStatus !== "Active") {
      return res.status(400).json({
        message: "Please contact the institute for further information",
      });
    }

    if (userType === "user") {
      const userQuery =
        "SELECT user_status FROM users WHERE user_id = $1 AND institute_id_c = $2";
      const userResult = await db.query(userQuery, [userID, instituteID]);

      if (userResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "User ID not found in this institute" });
      }

      const userStatus = userResult.rows[0].user_status;

      if (userStatus !== "Active") {
        return res.status(400).json({ message: "Your ID is blocked" });
      }

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

exports.updateDetails = async (req, res) => {
  try {
    const {instituteID, userID, userType, changesData} = req.body;
    const instituteQuery =
      "SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1";
    const instituteResult = await db.query(instituteQuery, [instituteID]);

    if (instituteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No institute found with the provided ID" });
    }

    const instituteStatus = instituteResult.rows[0].institute_status;

    if (instituteStatus !== "Active") {
      return res.status(400).json({
        message: "Please contact the institute for further information",
      });
    }
    
  } catch (error) {
    
  }
}
