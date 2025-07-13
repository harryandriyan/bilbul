import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import {extractReceiptData} from './ai/flows/extract-receipt-data';
import {suggestSplit} from './ai/flows/suggest-split';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Auth endpoints
app.get('/api/auth/session', async (req, res) => {
  try {
    // For now, return null user (not authenticated)
    // In a real app, you'd verify the session token here
    res.json({user: null});
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    // Placeholder for email/password sign in
    const {email, password} = req.body;
    // In a real app, you'd verify credentials here
    res.json({success: true, user: {email, id: '1'}});
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    // Placeholder for email/password sign up
    const {email, password} = req.body;
    // In a real app, you'd create user here
    res.json({success: true, user: {email, id: '1'}});
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    // Placeholder for Google OAuth
    res.json({success: true, redirectUrl: '/auth/callback'});
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    // Placeholder for logout
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/extract-receipt', async (req, res) => {
  try {
    const result = await extractReceiptData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

app.post('/api/suggest-split', async (req, res) => {
  try {
    const result = await suggestSplit(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({error: error instanceof Error ? error.message : 'Unknown error'});
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 