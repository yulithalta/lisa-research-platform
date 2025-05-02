/**
 * LISA System - Database Backup Script
 * 
 * This script creates backups of the PostgreSQL database and configuration
 * It can be scheduled as a cron job to run daily, weekly, etc.
 * 
 * Usage: node config/database/backup.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DATABASE_NAME = process.env.POSTGRES_DB || 'lisa_db';
const DATABASE_USER = process.env.POSTGRES_USER || 'lisa_user';
const DATABASE_HOST = process.env.POSTGRES_HOST || 'localhost';
const DATABASE_PORT = process.env.POSTGRES_PORT || '5432';

// Make sure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  warn: (message) => console.warn(`[WARNING] ${message}`)
};

/**
 * Create database backup
 */
async function createDatabaseBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const backupFileName = `${DATABASE_NAME}_${timestamp}.sql`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    
    // Create backup command
    const cmd = `PGPASSWORD=${process.env.POSTGRES_PASSWORD} pg_dump -h ${DATABASE_HOST} -p ${DATABASE_PORT} -U ${DATABASE_USER} -d ${DATABASE_NAME} -F p -f ${backupFilePath}`;
    
    logger.info(`Creating database backup to ${backupFilePath}`);
    await execPromise(cmd);
    
    // Compress the backup
    logger.info('Compressing backup...');
    await execPromise(`gzip ${backupFilePath}`);
    
    logger.success(`Database backup created: ${backupFilePath}.gz`);
    return `${backupFilePath}.gz`;
  } catch (error) {
    logger.error(`Error creating database backup: ${error.message}`);
    throw error;
  }
}

/**
 * Create configuration backup
 */
async function createConfigBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const configBackupDir = path.join(BACKUP_DIR, 'config');
    const configBackupPath = path.join(configBackupDir, `config_${timestamp}.tar.gz`);
    
    // Make sure config backup directory exists
    if (!fs.existsSync(configBackupDir)) {
      fs.mkdirSync(configBackupDir, { recursive: true });
    }
    
    // Create backup of .env file and config directories
    const sourcePaths = [
      '.env',
      'config',
      'data'
    ].filter(p => fs.existsSync(path.join(__dirname, '../../', p)));
    
    if (sourcePaths.length === 0) {
      logger.warn('No configuration files found to backup');
      return null;
    }
    
    // Create tar archive
    const cmd = `tar -czf ${configBackupPath} -C ${path.join(__dirname, '../..')} ${sourcePaths.join(' ')}`;
    
    logger.info(`Creating configuration backup to ${configBackupPath}`);
    await execPromise(cmd);
    
    logger.success(`Configuration backup created: ${configBackupPath}`);
    return configBackupPath;
  } catch (error) {
    logger.error(`Error creating configuration backup: ${error.message}`);
    throw error;
  }
}

/**
 * Clean up old backups
 * @param {number} daysToKeep - Number of days to keep backups
 */
async function cleanupOldBackups(daysToKeep = 30) {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToKeep));
    
    // Database backups
    const dbBackups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return { filePath, mtime: stats.mtime };
      });
    
    // Config backups
    const configBackupDir = path.join(BACKUP_DIR, 'config');
    let configBackups = [];
    
    if (fs.existsSync(configBackupDir)) {
      configBackups = fs.readdirSync(configBackupDir)
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(configBackupDir, file);
          const stats = fs.statSync(filePath);
          return { filePath, mtime: stats.mtime };
        });
    }
    
    // Find old backups
    const oldDbBackups = dbBackups.filter(backup => backup.mtime < cutoffDate);
    const oldConfigBackups = configBackups.filter(backup => backup.mtime < cutoffDate);
    
    // Delete old backups
    let deletedCount = 0;
    
    for (const backup of [...oldDbBackups, ...oldConfigBackups]) {
      fs.unlinkSync(backup.filePath);
      deletedCount++;
    }
    
    if (deletedCount > 0) {
      logger.success(`Deleted ${deletedCount} old backups (older than ${daysToKeep} days)`);
    } else {
      logger.info(`No old backups to delete (older than ${daysToKeep} days)`);
    }
  } catch (error) {
    logger.error(`Error cleaning up old backups: ${error.message}`);
  }
}

/**
 * Main backup function
 */
async function runBackup() {
  try {
    logger.info('Starting backup process');
    
    // Create database backup
    await createDatabaseBackup();
    
    // Create configuration backup
    await createConfigBackup();
    
    // Clean up old backups (keep last 30 days)
    await cleanupOldBackups(30);
    
    logger.success('Backup process completed successfully');
  } catch (error) {
    logger.error(`Backup process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run backup if script is called directly
if (require.main === module) {
  runBackup().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { runBackup, createDatabaseBackup, createConfigBackup, cleanupOldBackups };