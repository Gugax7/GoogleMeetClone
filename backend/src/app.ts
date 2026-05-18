import express from 'express';
import path from 'path';

const app = express();

app.use(express.static(path.join('/frontend/dist')))

export default app;