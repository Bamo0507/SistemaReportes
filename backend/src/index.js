import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();      
const { Pool } = pkg;

const app = express();
app.use(express.json());

// conecta a Postgres usando las vars de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});


const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});