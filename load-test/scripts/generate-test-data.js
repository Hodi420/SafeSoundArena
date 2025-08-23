const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

// Configuration
const NUM_USERS = 1000;
const OUTPUT_FILE = path.join(__dirname, '../test-data/users.json');

// Ensure test-data directory exists
const testDataDir = path.join(__dirname, '../test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Generate test users
async function generateTestUsers(count) {
  const users = [];
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  
  // Generate admin user
  users.push({
    id: '000000000000000000000001',
    email: 'admin@loadtest.local',
    password: 'AdminPass123!',
    username: 'loadtestadmin',
    role: 'admin',
    isEmailVerified: true,
    name: 'Load Test Admin',
  });
  
  // Generate regular users
  for (let i = 1; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `loadtest.user${i}@example.com`;
    
    users.push({
      id: faker.database.mongodbObjectId(),
      email,
      password: 'TestPass123!',
      username: `loadtest${i}`,
      role: 'user',
      isEmailVerified: true,
      name: `${firstName} ${lastName}`,
      profile: {
        avatar: faker.image.avatar(),
        bio: faker.lorem.sentences(2),
        location: `${faker.location.city()}, ${faker.location.country()}`,
      },
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
        notifications: {
          email: faker.datatype.boolean(),
          push: faker.datatype.boolean(),
        },
      },
      metadata: {
        lastLogin: faker.date.recent(),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
      },
    });
  }
  
  return users;
}

// Generate and save test data
async function main() {
  try {
    console.log(`Generating ${NUM_USERS} test users...`);
    const users = await generateTestUsers(NUM_USERS);
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2));
    console.log(`Test data saved to ${OUTPUT_FILE}`);
    
    console.log('\nSample user:');
    console.log(JSON.stringify(users[0], null, 2));
    
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
}

// Run the generator
main();
