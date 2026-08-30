#!/usr/bin/env node

/**
 * SafeSoundArena Database Initialization
 * Handles multiple database engines and seeds sample data
 * 
 * Usage: node db-init.js
 * Env vars: MONGO_URI, SEED_DATA, DB_ENGINE
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Sample data for seeding
const SAMPLE_DATA = {
  users: [
    {
      username: 'pioneer_alpha',
      email: 'pioneer.alpha@safesoundarena.local',
      profile: { level: 1, coins: 100 },
      role: 'pioneer',
    },
    {
      username: 'admin_dev',
      email: 'admin@safesoundarena.local',
      profile: { level: 50, coins: 10000 },
      role: 'admin',
    },
    {
      username: 'moderator_test',
      email: 'mod@safesoundarena.local',
      profile: { level: 30, coins: 5000 },
      role: 'moderator',
    },
  ],
  arenas: [
    {
      name: 'Carnival Arena',
      mode: 'competitive',
      maxPlayers: 8,
      minLevel: 1,
      description: 'Fast-paced competitive arena battles',
    },
    {
      name: 'Pong Arena',
      mode: 'classic',
      maxPlayers: 2,
      minLevel: 1,
      description: 'Retro Pong gameplay',
    },
    {
      name: 'Party Quest',
      mode: 'cooperative',
      maxPlayers: 4,
      minLevel: 5,
      description: 'Team-based quest system',
    },
  ],
  quests: [
    {
      title: 'Welcome to SafeSoundArena',
      description: 'Complete your first game',
      reward: 50,
      difficulty: 'easy',
    },
    {
      title: 'Sound Master',
      description: 'Win 10 games in Carnival Arena',
      reward: 500,
      difficulty: 'medium',
    },
    {
      title: 'Legend',
      description: 'Reach level 50',
      reward: 5000,
      difficulty: 'hard',
    },
  ],
};

// ─── Connection Setup ──────────────────────────────────────────────────────────

async function connectMongoDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable not set');
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ Connected to MongoDB:', mongoUri);
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

// ─── Schema Definitions ────────────────────────────────────────────────────────

function defineSchemas() {
  // User Schema
  const userSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 64,
      },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /.+\@.+\..+/,
      },
      profile: {
        level: { type: Number, default: 1, min: 1 },
        coins: { type: Number, default: 0, min: 0 },
        avatar: { type: String, default: null },
      },
      role: {
        type: String,
        enum: ['pioneer', 'moderator', 'admin'],
        default: 'pioneer',
      },
      createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
  );

  // Arena Schema
  const arenaSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true },
      mode: {
        type: String,
        enum: ['competitive', 'cooperative', 'classic'],
        required: true,
      },
      maxPlayers: { type: Number, required: true, min: 2 },
      minLevel: { type: Number, default: 1, min: 1 },
      description: String,
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  // Quest Schema
  const questSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      description: String,
      reward: { type: Number, required: true, min: 0 },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy',
      },
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  return {
    User: mongoose.model('User', userSchema),
    Arena: mongoose.model('Arena', arenaSchema),
    Quest: mongoose.model('Quest', questSchema),
  };
}

// ─── Initialization Functions ──────────────────────────────────────────────────

async function clearCollections(models) {
  console.log('\nClearing existing data...');
  for (const [name, model] of Object.entries(models)) {
    const count = await model.countDocuments();
    if (count > 0) {
      await model.deleteMany({});
      console.log(`  ✓ Cleared ${name} (${count} documents)`);
    }
  }
}

async function seedCollections(models) {
  console.log('\nSeeding sample data...');

  // Seed Users
  const users = await models.User.insertMany(SAMPLE_DATA.users);
  console.log(`  ✓ Created ${users.length} sample users`);

  // Seed Arenas
  const arenas = await models.Arena.insertMany(SAMPLE_DATA.arenas);
  console.log(`  ✓ Created ${arenas.length} sample arenas`);

  // Seed Quests
  const quests = await models.Quest.insertMany(SAMPLE_DATA.quests);
  console.log(`  ✓ Created ${quests.length} sample quests`);

  // Sample match history
  const Match = mongoose.model('Match', new mongoose.Schema({
    players: [String],
    arena: String,
    duration: Number,
    winner: String,
    rewards: Object,
  }), 'matches');

  const sampleMatch = await Match.create({
    players: [users[0]._id.toString(), users[1]._id.toString()],
    arena: arenas[0]._id.toString(),
    duration: 300,
    winner: users[0]._id.toString(),
    rewards: { coins: 100, exp: 50 },
  });
  console.log('  ✓ Created sample match record');

  return { users, arenas, quests };
}

// ─── Validation & Health Check ────────────────────────────────────────────────

async function validateDatabase(models) {
  console.log('\nValidating database...');

  for (const [name, model] of Object.entries(models)) {
    const count = await model.countDocuments();
    console.log(`  ✓ ${name}: ${count} documents`);
  }
}

async function createIndexes(models) {
  console.log('\nCreating indexes...');

  // User indexes
  await models.User.collection.createIndex({ username: 1 });
  await models.User.collection.createIndex({ email: 1 });
  console.log('  ✓ User indexes created');

  // Arena indexes
  await models.Arena.collection.createIndex({ name: 1 });
  await models.Arena.collection.createIndex({ active: 1 });
  console.log('  ✓ Arena indexes created');

  // Quest indexes
  await models.Quest.collection.createIndex({ active: 1 });
  console.log('  ✓ Quest indexes created');
}

// ─── Main Initialization Flow ──────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     SafeSoundArena Database Initialization                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to database
    await connectMongoDB();

    // Define schemas
    const models = defineSchemas();
    console.log('✓ Schemas defined');

    // Clear existing data
    await clearCollections(models);

    // Seed sample data if enabled
    const shouldSeed = process.env.SEED_DATA === 'true';
    if (shouldSeed) {
      await seedCollections(models);
    } else {
      console.log('\nSkipping sample data (set SEED_DATA=true to enable)');
    }

    // Create indexes
    await createIndexes(models);

    // Validate
    await validateDatabase(models);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✓ Initialization complete in ${duration}s`);

    // Summary
    console.log('\nNext steps:');
    console.log('  1. Start backend: npm start');
    console.log('  2. Start frontend: cd frontend && npm run dev');
    console.log('  3. Visit http://localhost:3000\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Initialization failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// ─── Error Handling ────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n\nInterrupted. Cleaning up...');
  await mongoose.connection.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { SAMPLE_DATA, defineSchemas };
