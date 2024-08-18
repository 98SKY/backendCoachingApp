const db = require('../config/db');
const {} = require('../Global');


exports.dashboardCounts = async (req, res) => {
    try {
        const { instituteID, categories, fromDate, toDate } = req.body;

        // Check if instituteID exists
        const instituteQuery = 'SELECT institute_id, institute_status FROM institutes WHERE institute_id = $1';
        const instituteResult = await db.query(instituteQuery, [instituteID]);

        if (instituteResult.rows.length === 0) {
            return res.status(404).json({ message: 'No institute found with the provided ID' });
        }

        const instituteStatus = instituteResult.rows[0].institute_status;

        // Check institute status
        if (instituteStatus !== 'Active') {
            return res.status(400).json({ message: 'Please contact the institute for further information' });
        }

        // Initialize counts object and queries array
        const counts = {};
        const queries = [];

        // Define the default date range if fromDate and toDate are null
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        const formattedToday = today.toISOString().split('T')[0];
        const formattedThreeMonthsAgo = threeMonthsAgo.toISOString().split('T')[0];

        // Use provided dates or default to the last three months
        const startDate = fromDate || formattedThreeMonthsAgo;
        const endDate = toDate || formattedToday;

        // Conditionally execute queries based on categories array
        if (categories.includes('students')) {
            const studentCountQuery = db.query(
                `SELECT
                    COUNT(*) AS total_students,
                    COUNT(CASE WHEN u.user_status = 'Active' THEN 1 END) AS active_students,
                    COUNT(CASE WHEN u.user_status = 'Inactive' THEN 1 END) AS inactive_students
                FROM students s
                JOIN users u ON u.user_id = s.users_id_c
                WHERE s.institute_id_c = $1
                  AND s.entered_date BETWEEN $2 AND $3`,
                [instituteID, startDate, endDate]
            );
            queries.push(studentCountQuery.then(result => {
                counts.totalStudents = result.rows[0].total_students;
                counts.activeStudents = result.rows[0].active_students;
                counts.inactiveStudents = result.rows[0].inactive_students;
            }));
        }

        if (categories.includes('teachers')) {
            const teacherCountQuery = db.query(
                `SELECT
                    COUNT(*) AS total_teachers,
                    COUNT(CASE WHEN u.user_status = 'Active' THEN 1 END) AS active_teachers,
                    COUNT(CASE WHEN u.user_status = 'Inactive' THEN 1 END) AS inactive_teachers
                FROM teachers t
                JOIN users u ON u.user_id = t.users_id_c
                WHERE t.institute_id_c = $1
                  AND t.entered_date BETWEEN $2 AND $3`,
                [instituteID, startDate, endDate]
            );
            queries.push(teacherCountQuery.then(result => {
                counts.totalTeachers = result.rows[0].total_teachers;
                counts.activeTeachers = result.rows[0].active_teachers;
                counts.inactiveTeachers = result.rows[0].inactive_teachers;
            }));
        }

        if (categories.includes('staff')) {
            const staffCountQuery = db.query(
                `SELECT COUNT(*) AS total_staff
                 FROM staff
                 WHERE institute_id_c = $1`,
                [instituteID]
            );
            queries.push(staffCountQuery.then(result => counts.staff = result.rows[0].total_staff));
        }

        // Execute all queries
        await Promise.all(queries);

        // Send response with counts and date range
        res.status(200).json({
            message: 'Counts fetched successfully',
            counts,
            fromDate: startDate,
            toDate: endDate
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};