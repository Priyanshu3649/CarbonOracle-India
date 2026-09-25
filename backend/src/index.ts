import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import plotsRouter from './routes/plots';
import speciesRouter from './routes/species';
import treesRouter from './routes/trees';
import analyticsRouter from './routes/analytics';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

import authRouter from './routes/auth';
import blockchainRouter from './routes/blockchain';
import marketplaceRouter from './routes/marketplace';

app.use('/api/auth', authRouter);
app.use('/api/plots', plotsRouter);
app.use('/api/species', speciesRouter);
app.use('/api/trees', treesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/blockchain', blockchainRouter);
app.use('/api/marketplace', marketplaceRouter);

import http from 'http';
import { setupWebSocketServer } from './websocket';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server attached`);
});
