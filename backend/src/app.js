import express from 'express';
import cors from 'cors';
import recipesRouter from './routes/recipes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/recipes', recipesRouter);

export default app;