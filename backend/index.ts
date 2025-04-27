import express from 'express';
import cors from 'cors';
import { fitbitRouter } from './routes/fitbit';
import { medicationsRouter } from './routes/medications';
import { symptomsRouter } from './routes/symptoms';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/fitbit', fitbitRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/symptoms', symptomsRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 