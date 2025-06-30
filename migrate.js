#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Set working directory ke src untuk migrasi
const migrationsPath = path.join(__dirname, 'src', 'migrations');
const seedersPath = path.join(__dirname, 'src', 'seeders');
const configPath = path.join(__dirname, 'src', 'config', 'config.js');

const commands = {
  migrate: `npx sequelize-cli db:migrate --migrations-path ${migrationsPath} --config ${configPath}`,
  'migrate:undo': `npx sequelize-cli db:migrate:undo --migrations-path ${migrationsPath} --config ${configPath}`,
  'migrate:reset': `npx sequelize-cli db:migrate:undo:all --migrations-path ${migrationsPath} --config ${configPath}`,
  seed: `npx sequelize-cli db:seed:all --seeders-path ${seedersPath} --config ${configPath}`,
  'seed:undo': `npx sequelize-cli db:seed:undo:all --seeders-path ${seedersPath} --config ${configPath}`,
  fresh: 'fresh' // Special command untuk reset dan migrate ulang
};

const command = process.argv[2];

if (!command || !commands[command]) {
  console.log('✨ Fintrack Migration Helper - Gen Z Style! 🚀\n');
  console.log('Available commands:');
  console.log('📦 migrate        - Run all pending migrations');
  console.log('⏪ migrate:undo   - Rollback last migration');
  console.log('🔄 migrate:reset  - Rollback all migrations');
  console.log('🌱 seed           - Run all seeders');
  console.log('🧹 seed:undo     - Undo all seeders');
  console.log('✨ fresh          - Fresh install (reset + migrate + seed)');
  console.log('\nUsage: node migrate.js <command>');
  process.exit(1);
}

function runCommand(cmd, description) {
  console.log(`\n🔥 ${description}...`);
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️  Warning: ${stderr}`);
      }
      console.log(stdout);
      console.log(`✅ ${description} completed!`);
      resolve();
    });
  });
}

async function runFresh() {
  try {
    console.log('🔥 Starting fresh installation...');
    
    // Reset semua
    await runCommand(commands['migrate:reset'], 'Resetting all migrations');
    await runCommand(commands['seed:undo'], 'Undoing all seeds');
    
    // Install ulang
    await runCommand(commands['migrate'], 'Running all migrations');
    await runCommand(commands['seed'], 'Running all seeders');
    
    console.log('\n🎉 Fresh installation completed! Database is ready to rock! 🚀');
  } catch (error) {
    console.error('\n💥 Fresh installation failed!');
    process.exit(1);
  }
}

// Execute command
if (command === 'fresh') {
  runFresh();
} else {
  const description = {
    'migrate': 'Running migrations',
    'migrate:undo': 'Rolling back last migration',
    'migrate:reset': 'Resetting all migrations',
    'seed': 'Running seeders',
    'seed:undo': 'Undoing seeders'
  }[command];

  runCommand(commands[command], description)
    .then(() => {
      console.log('\n🎉 All done! Your database is vibing! ✨');
    })
    .catch(() => {
      console.error('\n💥 Something went wrong! Check the errors above.');
      process.exit(1);
    });
} 