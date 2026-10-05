const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = require('./app');

dotenv.config({ path: './config.env' });
mongoose.connect(process.env.DATABASE, {}).then(() => {
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`app running on ${port}`);
});
