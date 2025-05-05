import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fitbitRouter } from './routes/fitbit';
import { medicationsRouter } from './routes/medications';
import { awairRouter } from './routes/awair';
import { weatherRouter } from './routes/weather';
import { healthRouter } from './routes/health';
import notesRouter from './routes/notes';
import { symptomRouter } from './routes/symptom';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS for development
app.use(cors({
  origin: 'http://localhost:8080', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API routes
app.use('/api/fitbit', fitbitRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/awair', awairRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/notes', notesRouter);
app.use('/api/health', healthRouter);
app.use('/api/symptom', symptomRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
}); 