import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fitbitRouter } from './routes/fitbit';
import { awairRouter } from './routes/awair';
import { weatherRouter } from './routes/weather';
import { medicationRouter } from './routes/medication';
import { symptomRouter } from './routes/symptom';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/fitbit', fitbitRouter);
app.use('/api/awair', awairRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/medication', medicationRouter);
app.use('/api/symptom', symptomRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 