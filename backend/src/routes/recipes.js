import { Router } from 'express';

const router = Router();

router.get('/search', async (req, res) => {
  if (!process.env.SPOONACULAR_API_KEY) {
    return res.status(500).json({ error: 'Spoonacular API key is not configured' });
  }

  try {
    const params = new URLSearchParams({
      apiKey: process.env.SPOONACULAR_API_KEY,
      query: req.query.query || '',
      diet: req.query.diet || '',
      intolerances: req.query.intolerances || '',
      number: req.query.number || '12',
      addRecipeInformation: 'true'
    });

    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params}`
    );
    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload.message || 'Recipe provider request failed'
      });
    }

    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: 'Could not reach the recipe provider' });
  }
});

export default router;