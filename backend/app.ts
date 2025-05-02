import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import symptomsRoutes from './routes/symptoms';
import notesRoutes from './routes/notes';
import medicationsRouter from './routes/medications';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/symptoms', symptomsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/medications', medicationsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

export default app; 