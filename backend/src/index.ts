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

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Express on Vercel");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;