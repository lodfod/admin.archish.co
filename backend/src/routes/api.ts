import { Router, Request, Response } from 'express';
import { generateSummary } from '../controllers/blogController';
import * as dotenv from 'dotenv';
dotenv.config();
const router = Router();

router.post('/generate-summary', async (req: Request, res: Response) => {
  await generateSummary(req, res);
});

export default router;
