/**
 * Worker Process Entry Point
 * Run this file separately to start background job processors
 * Usage: npm run worker
 */

import dotenv from 'dotenv';
dotenv.config();

import { workers, shutdownWorkers } from './workers/index.js';
import { SchedulerService } from './services/scheduler.service.js';

console.log('🚀 Starting background job workers...');

// Start the auto-pilot scheduler
await SchedulerService.start();

// Log worker status
Object.keys(workers).forEach((workerName) => {
  console.log(`✓ ${workerName} worker started`);
});

console.log('✅ All workers are running');

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await SchedulerService.stop();
  await shutdownWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await SchedulerService.stop();
  await shutdownWorkers();
  process.exit(0);
});

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
});

// Log every minute
setInterval(() => {
  console.log(`⏰ Workers alive - ${new Date().toISOString()}`);
}, 60000);
