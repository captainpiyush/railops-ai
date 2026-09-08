const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const defectRoutes = require('./routes/defects');
const blockRoutes = require('./routes/blocks');
const corridorRoutes = require('./routes/corridors');
const scheduleRoutes = require('./routes/schedules');
const optimizationRoutes = require('./routes/optimization');
const simulationRoutes = require('./routes/simulation');
const integrationRoutes = require('./routes/integration');
const recommendationRoutes = require('./routes/recommendations');
const systemRoutes = require('./routes/system');
const { seedDatabase } = require('./seed/seed');
const Defect = require('./models/Defect');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

app.use('/api/defects', defectRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/corridors', corridorRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/system', systemRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    const defectCount = await Defect.countDocuments();
    if (defectCount === 0) {
      await seedDatabase();
      console.log('Database seeded.');
    }

    // To re-seed with corrected dates, drop the DB and restart:
    // mongosh railops_ai --eval "db.dropDatabase()" && npm run dev
    app.listen(PORT, () => console.log(`RailOps AI backend running on port ${PORT}`));
  } catch (error) {
    console.error('Error connecting to database or starting server:', error);
    process.exit(1);
  }
})();
