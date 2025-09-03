// To run this script, you need to have Node.js and npm installed.
// 1. Run `npm init -y` in your project folder if you don't have a package.json.
// 2. Run `npm install express` to install the required library.
// 3. Start the server by running `node server.js`.

const express = require('express');
const path = require('path');

const app = express();

// Hosting providers like KingHost often set the PORT environment variable.
// We use that port, or default to 3000 for local development.
const port = process.env.PORT || 3000;

// Serve all files in the current directory (public assets).
// This makes index.html, index.tsx, and all other project files accessible.
app.use(express.static(path.join(__dirname, '/')));

// For any route that doesn't match a static file, serve the main index.html.
// This is crucial for Single-Page Applications (SPAs) to handle client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running and listening on port ${port}`);
  console.log(`You can access the application at http://localhost:${port}`);
});
