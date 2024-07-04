const express = require('express');
require('dotenv').config();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to database ');
});

// insert personal info
app.post('/insertPInfo', (req, res) => {
    const { fullName,designation, email, phoneNo, address, githubLink, linkedInLink } = req.body;
    const sql = `INSERT INTO resume_builder.personalInfo(
    fullName,designation, email, phoneNo, address, githubLink, linkedInLink
) VALUES (?,?, ?, ?, ?, ?, ?);`;
    const values = [fullName, designation,email, phoneNo, address, githubLink, linkedInLink];
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to insert personal Info', error: error.message });
        } else {
            console.log('Insert Result:', results);
            res.json({ status: 'success', message: 'Data inserted personal Info successfully', insertId: results.insertId });
        }
    });
});

function getPDetails(pId) {
    const sql = `
        select * from resume_builder.personalInfo where p_Id = ?;
    `;
    return new Promise((resolve, reject) => {
        connection.query(sql, [pId], (err, results) => {
            if (err) {
                console.error('Error executing SQL:', err);
                reject(err);
            } else {
                console.log('personal Info:', results);
                resolve(results);
            }
        });
    });
}
app.get('/getPDetails/:pId', async (req, res) => {
    const pId = parseInt(req.params.pId, 10);
    if (!isNaN(pId) && pId > 0) {
        try {
            const results = await getPDetails(pId);
            res.json(results);
        } catch (err) {
            res.status(500).send("Error fetching personal Info");
        }
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.error("Error fetching latest pId:", err);
                return res.status(500).send("Error fetching personal Info");
            }
            if (result.length === 0) {
                console.error("No records found in personalInfo");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            try {
                const results = await getPDetails(lastId);
                res.json(results);
            } catch (err) {
                res.status(500).send("Error fetching personal Info");
            }
        });
    }
});
app.get('/personalInfo/:email', (req, res) => {
    const { email } = req.params;
    const query = `SELECT p_Id FROM personalInfo WHERE email = ? ORDER BY p_Id DESC LIMIT 1`;

    connection.query(query, [email], (error, results, fields) => {
      if (error) {
        return res.status(500).json({ error });
      }
      res.json(results[0]); // This returns only the first result, which is the latest p_Id
    });
  });

// Skills
app.get('/getAllSkills', (req, res) => {
    const sql = "SELECT * FROM skills;";
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching skills:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve skills ',
                error: err.message
            });
        }
        console.log('Fetched Skills:', results);
        res.status(200).json({
            status: 'success',
            message: 'Skills data retrieved successfully',
            data: results
        });
    });
});

// Persons Skills
function insertSkills(skillId, personId, response) {
    const sql = `INSERT INTO resume_builder.p_skills (skill_Id, p_Id) VALUES (?, ?);`;
    const values = [skillId, personId];
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            response.status(500).json({ status: 'error', message: 'Failed to insert Persons Skills', error: error.message });
        } else {
            console.log('Insert Result:', results);
            response.json({ status: 'success', message: 'Data inserted Persons Skills successfully', insertId: results.insertId });
        }
    });
}
app.post('/selectSkills', (req, res) => {
    const { skill_Id, p_Id } = req.body;
    const parsedPersonId = parseInt(p_Id);
    if (!isNaN(parsedPersonId) && parsedPersonId) {
        insertSkills(skill_Id, parsedPersonId, res);
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, (err, result) => {
            if (err) {
                console.error("Error fetching latest p_Id:", err);
                return res.status(500).send("Error fetching Persons Skills");
            }
            if (result.length === 0) {
                console.error("No records found in Persons Skills");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            insertSkills(skill_Id, lastId, res);
        });
    }
});

function getPskills(pId) {
    const sql = `
        SELECT ps.skill_Id, s.skillName
        FROM p_skills AS ps
        JOIN skills AS s ON ps.skill_Id = s.skill_Id
        WHERE ps.p_Id = ?
    `;
    return new Promise((resolve, reject) => {
        connection.query(sql, [pId], (err, results) => {
            if (err) {
                console.error('Error executing SQL:', err);
                reject(err);
            } else {
                console.log('Persons Skills:', results);
                resolve(results);
            }
        });
    });
}
app.get('/getPskills/:pId', async (req, res) => {
    const pId = parseInt(req.params.pId, 10);
    if (!isNaN(pId) && pId > 0) {
        try {
            const results = await getPskills(pId);
            res.json(results);
        } catch (err) {
            res.status(500).send("Error fetching Persons Skills");
        }
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.error("Error fetching latest pId:", err);
                return res.status(500).send("Error fetching Persons Skills");
            }
            if (result.length === 0) {
                console.error("No records found in Persons Skills");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            try {
                const results = await getPskills(lastId);
                res.json(results);
            } catch (err) {
                res.status(500).send("Error fetching Persons Skills");
            }
        });
    }
});

// experience 
function insertExperience(p_Id, companyName, designation, timePeriod, jobDescription, response) {
    const sql = `INSERT INTO p_experience (p_Id, companyName, designation, timePeriod, jobDescription) VALUES (?, ?, ?, ?, ?)`;
    const values = [p_Id, companyName, designation, timePeriod, jobDescription];
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            response.status(500).json({ status: 'error', message: 'Failed to insert experience', error: error.message });
        } else {
            console.log('Insert Result:', results);
            response.json({ status: 'success', message: 'Data inserted experience successfully', insertId: results.insertId });
        }
    });
}
app.post('/insertExperience', (req, res) => {
    const { p_Id, companyName, designation, timePeriod, jobDescription } = req.body;
    const parsedPersonId = parseInt(p_Id);
    if (!isNaN(parsedPersonId) && parsedPersonId) {
        insertExperience(p_Id, companyName, designation, timePeriod, jobDescription, res);
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, (err, result) => {
            if (err) {
                console.error("Error fetching latest p_Id:", err);
                return res.status(500).send("Error fetching experience");
            }
            if (result.length === 0) {
                console.error("No records found in experience");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            insertExperience(lastId, companyName, designation, timePeriod, jobDescription, res);
        });
    }
});

function getPExperience(pId) {
    const sql = `
        select * from resume_builder.p_experience  where p_Id = ? ;
    `;
    return new Promise((resolve, reject) => {
        connection.query(sql, [pId], (err, results) => {
            if (err) {
                console.error('Error executing SQL:', err);
                reject(err);
            } else {
                console.log('Person experience:', results);
                resolve(results);
            }
        });
    });
}
app.get('/getPExperience/:pId', async (req, res) => {
    const pId = parseInt(req.params.pId, 10);
    if (!isNaN(pId) && pId > 0) {
        try {
            const results = await getPExperience(pId);
            res.json(results);
        } catch (err) {
            res.status(500).send("Error fetching experience");
        }
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.error("Error fetching latest pId:", err);
                return res.status(500).send("Error fetching data");
            }
            if (result.length === 0) {
                console.error("No records found in experience");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            try {
                const results = await getPExperience(lastId);
                res.json(results);
            } catch (err) {
                res.status(500).send("Error fetching experience");
            }
        });
    }
});

// Project Details
function insertProject(p_Id, projectTitle, projectDetail, response) {
    const sql = `INSERT INTO resume_builder.p_projects (p_Id,projectTitle,projectDetail) VALUES (?, ?,?)`;
    const values = [p_Id, projectTitle, projectDetail];
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            response.status(500).json({ status: 'error', message: 'Failed to insert Project Details', error: error.message });
        } else {
            console.log('Insert Result:', results);
            response.json({ status: 'success', message: 'Data inserted Project Details successfully', insertId: results.insertId });
        }
    });
}
app.post('/insertProject', (req, res) => {
    const { p_Id, projectTitle, projectDetail } = req.body;
    const parsedPersonId = parseInt(p_Id);
    if (!isNaN(parsedPersonId) && parsedPersonId) {
        insertProject(p_Id, projectTitle, projectDetail, res);
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, (err, result) => {
            if (err) {
                console.error("Error fetching latest p_Id:", err);
                return res.status(500).send("Error fetching Project Details");
            }
            if (result.length === 0) {
                console.error("No records found in Project Details");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            insertProject(lastId, projectTitle, projectDetail, res);
        });
    }
});

function getPProject(pId) {
    const sql = `
        select * from resume_builder.p_projects  where p_Id = ? ;
    `;
    return new Promise((resolve, reject) => {
        connection.query(sql, [pId], (err, results) => {
            if (err) {
                console.error('Error executing SQL:', err);
                reject(err);
            } else {
                console.log('Person Project Details:', results);
                resolve(results);
            }
        });
    });
}
app.get('/getPProject/:pId', async (req, res) => {
    const pId = parseInt(req.params.pId, 10);
    if (!isNaN(pId) && pId > 0) {
        try {
            const results = await getPProject(pId);
            res.json(results);
        } catch (err) {
            res.status(500).send("Error fetching Project Details");
        }
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.error("Error fetching latest pId:", err);
                return res.status(500).send("Error fetching data");
            }
            if (result.length === 0) {
                console.error("No records found in Project Details");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            try {
                const results = await getPProject(lastId);
                res.json(results);
            } catch (err) {
                res.status(500).send("Error fetching experience");
            }
        });
    }
});

// education
function insertEducation(p_Id, instituteName, degreeTitle, passingYear, response) {
    const sql = `INSERT INTO p_education (p_Id, instituteName, degreeTitle, passingYear) VALUES (?, ?, ?, ?)`;
    const values = [p_Id, instituteName, degreeTitle, passingYear];
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            response.status(500).json({ status: 'error', message: 'Failed to insert education', error: error.message });
        } else {
            console.log('Insert Result:', results);
            response.json({ status: 'success', message: 'Data inserted education successfully', insertId: results.insertId });
        }
    });
}
app.post('/insertEducation', (req, res) => {
    const { p_Id, instituteName, degreeTitle, passingYear } = req.body;
    const parsedPersonId = parseInt(p_Id);
    if (!isNaN(parsedPersonId) && parsedPersonId) {
        insertEducation(p_Id, instituteName, degreeTitle, passingYear, res);
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, (err, result) => {
            if (err) {
                console.error("Error fetching latest p_Id:", err);
                return res.status(500).send("Error fetching education");
            }
            if (result.length === 0) {
                console.error("No records found in education");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            insertEducation(lastId, instituteName, degreeTitle, passingYear, res);
        });
    }
});
function getPEducation(pId) {
    const sql = `
        select * from resume_builder.p_education  where p_Id = ? ;
    `;
    return new Promise((resolve, reject) => {
        connection.query(sql, [pId], (err, results) => {
            if (err) {
                console.error('Error executing SQL:', err);
                reject(err);
            } else {
                console.log('Person education:', results);
                resolve(results);
            }
        });
    });
}
app.get('/getPEducation/:pId', async (req, res) => {
    const pId = parseInt(req.params.pId, 10);
    if (!isNaN(pId) && pId > 0) {
        try {
            const results = await getPEducation(pId);
            res.json(results);
        } catch (err) {
            res.status(500).send("Error fetching education");
        }
    } else {
        const sql = `SELECT p_Id FROM personalInfo ORDER BY p_Id DESC LIMIT 1`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.error("Error fetching latest pId:", err);
                return res.status(500).send("Error fetching education");
            }
            if (result.length === 0) {
                console.error("No records found in education");
                return res.status(404).send("No records found");
            }
            const lastId = result[0].p_Id;
            try {
                const results = await getPEducation(lastId);
                res.json(results);
            } catch (err) {
                res.status(500).send("Error fetching education");
            }
        });
    }
});
const port = 3001;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
