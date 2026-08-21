import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateJWT } from './middleware/authMiddleware.js';
import { db } from './db/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('ClearTrust API Server is running');
});

// Example protected route
app.get('/api/protected', authenticateJWT, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
