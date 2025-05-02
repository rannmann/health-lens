import express from 'express';
import cors from 'cors';
import { symptomsRouter } from './routes/symptoms';
import notesRouter from './routes/notes';
import { medicationsRouter } from './routes/medications';
import { fitbitRouter } from './routes/fitbit';
import { healthRouter } from './routes/health';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/symptoms', symptomsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/fitbit', fitbitRouter);
app.use('/api/health', healthRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

export default app; 