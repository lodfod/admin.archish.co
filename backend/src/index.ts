import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import apiRoutes from './routes/api';

const result = dotenv.config();

console.log("All env variables:", process.env);
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length);

if (result.error) {
  console.log("❌ Error loading .env file:", result.error);
} else {
  console.log("✅ .env file loaded successfully");
  console.log("PORT:", process.env.PORT);
}

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Add debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

const corsOptions = {
  origin: ['http://localhost:5173', 'https://archish-co-admin-backend.vercel.app', 'https://admin.archish.co'],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api', apiRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Express on Vercel");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;