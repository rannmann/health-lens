import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import symptomsRoutes from './routes/symptoms';
import notesRoutes from './routes/notes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/symptoms', symptomsRoutes);
app.use('/api/notes', notesRoutes);

export default app; 