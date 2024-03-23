import express from 'express';
import morgan from 'morgan';

const app = express();

// Log requests
app.use(morgan('combined'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});