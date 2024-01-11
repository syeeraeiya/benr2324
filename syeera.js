const express = require('express')
const app = express()
const port = process.env.PORT || 3000;
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://b022210082:password1234@cluster0.uhzytme.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.use(express.json())

app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const existingUser = await client.db("BENR2423").collection("users").findOne({ "username": username });

        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        await client.db("BENR2423").collection("users").insertOne({
            username: username,
            password: hashedPassword,
            role: role
        })

        res.send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/student', async (req, res) => {
    console.log(req.headers.authorization)
    const token = req.headers.authorization.split(' ')
    console.log(token)

    jwt.verify(token, 'very strong password', (err, decoded) => {
        if (err) {
            res.status(401).send('Invalid token');
        }

        if (decoded.role == 'student') {
            client.db('assign').collection('student').findOne({ username: decoded.user },
                // Login
                app.post('/login', async (req, res) => {
                    const { username, password } = req.body;

                    try {
                        const user = await client.db("BENR2423").collection("users").findOne({ "username": username });

                        if (!user || !bcrypt.compareSync(password, user.password)) {
                            return res.status(401).send('Invalid username or password');
                        }

                        const token = jwt.sign({
                            user: username,
                            role: user.role
                        }, 'very strong password', { expiresIn: '1h' });


                        res.send({ token });

                    } catch (error) {
                        console.error(error);
                        res.status(500).send('Internal Server Error');
                    }
                }))
        }
    })
});

// Now, you can use verifyToken as middleware in your route
app.post('/record-attendance', verifyToken, async (req, res) => {
    if (req.role !== 'faculty') {
        return res.status(403).send('Forbidden: Only faculty can record attendance');
    }

    const { date, status } = req.body;

    try {
        await client.db("BENR2423").collection("attendance").insertOne({
            username: req.username,
            date: date,
            status: status
        });

        res.send('Attendance recorded successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// View Attendance Timeline
app.get('/attendance-timeline', verifyToken, async (req, res) => {
    try {
        const attendanceTimeline = await client.db("BENR2423").collection("attendance")
            .find({ username: req.username })
            .sort({ date: 1 })
            .toArray();

        res.send(attendanceTimeline);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// View Student List (for faculty)
app.get('/student-list', verifyToken, async (req, res) => {
    if (req.role !== 'faculty') {
        return res.status(403).send('Forbidden: Only faculty can view student list');
    }

    try {
        const students = await client.db("BENR2423").collection("users")
            .find({ role: 'student' })
            .project({ _id: 0, username: 1 })
            .toArray();

        res.send(students);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// View Attendance Report (for faculty)
app.get('/attendance-report', verifyToken, async (req, res) => {
    if (req.role !== 'faculty') {
        return res.status(403).send('Forbidden: Only faculty can view attendance report');
    }

    try {
        const attendanceReport = await client.db("BENR2423").collection("attendance")
            .aggregate([
                {
                    $group: {
                        _id: "$username",
                        totalDays: { $sum: 1 },
                        presentDays: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        username: "$_id",
                        totalDays: 1,
                        presentDays: 1,
                        absentDays: { $subtract: ["$totalDays", "$presentDays"] }
                    }
                }
            ])
            .toArray();

        res.send(attendanceReport);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send('Unauthorized: No token provided');
    }

    jwt.verify(token, 'your-secret-key', (err, decodedToken) => {
        if (err) {
            return res.status(401).send('Unauthorized: Invalid token');
        }

        // Assuming your token includes username and role information
        req.username = decodedToken.username;
        req.role = decodedToken.role;

        next();
    });
};