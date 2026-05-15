require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const playersRouter = require('./routes/players');
const matchesRouter = require('./routes/matches');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`PingPongZS backend running on http://localhost:${PORT}`);
});
