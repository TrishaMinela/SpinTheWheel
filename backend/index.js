const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); 

// In-memory history store
let spinHistory = [];

// GET /history - return all spin results
app.get('/history', (req, res) => {
  res.json(spinHistory);
});

// POST /history - add new spin result
app.post('/history', (req, res) => {
  const { winner, itemList } = req.body;

  if (!winner || !Array.isArray(itemList)) {
    return res.status(400).json({ error: "Missing winner or itemList field" });
  }

  const newSpinResult = {
    winner,
    itemList,
    timestamp: new Date().toISOString(),
  };

  spinHistory.push(newSpinResult);
  res.status(201).json(newSpinResult);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
