import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import intentRouter from './routes/intent.js';
import itineraryRouter from './routes/itinerary.js';

app.use('/api/intent', intentRouter);
app.use('/api/itinerary', itineraryRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'trippal-backend' });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
