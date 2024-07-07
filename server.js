const express = require('express');
const pg = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

const pool = new pg.Pool({
  user: 'root',
  host: 'database-deeparmor-login.c1wqcu6gcgxy.ap-south-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'password',
  port: 5432,
});

const secret_key = "887260ef7f0564d05badf0a15b3bc5c2";

// Middleware
app.use(express.json());

// JWT token verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: 'Token is required' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Token is required' });
  }

  jwt.verify(token, secret_key, (err, decoded) => {
    if (err) {
      console.log('Token verification error:', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Boss verification middleware
const bossVerification = (req, res, next) => {
  const { role } = req.user;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'You are not authorized' });
  }

  next();
};

// Login API endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  var user_role = "user"
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const query = 'SELECT * FROM users WHERE "Email" = $1 AND "Password" = $2';
    const result = await pool.query(query, [email, password]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (email == "sunil.kumar@deeparmor.com") {
      user_role = "admin"
    }
    else if (email == "nitin.lakshmanan@deeparmor.com") {
      user_role = "admin"
    }

    const user = result.rows[0];
    const token = jwt.sign({email: user.Email, role: user_role}, secret_key, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GetInfo API endpoint
app.get('/getinfo', verifyToken, async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const query = 'SELECT "FirstName", "LastName" FROM users WHERE "Email" = $1';
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ firstName: user.FirstName, lastName: user.LastName });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user endpoint
app.post('/dbupdate', verifyToken, bossVerification, async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Email, password, firstName, and lastName are required' });
  }

  try {
    const query = 'INSERT INTO users ("Email", "Password", "FirstName", "LastName") VALUES ($1, $2, $3, $4)';
    await pool.query(query, [email, password, firstName, lastName]);

    res.status(201).json({ message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user endpoint
app.delete('/deleteuser', verifyToken, bossVerification, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const query = 'DELETE FROM users WHERE "Email" = $1';
    const result = await pool.query(query, [username]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test database connection and fetch data on server start
pool.query('SELECT * FROM users', (err, res) => {
  if (err) {
    console.error('Error fetching data:', err);
  } else {
    console.log('Fetched data:', res.rows);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
