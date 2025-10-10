import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Mystore Admin Backend is running on http://localhost:${PORT}`);
});

export { app, server };
