const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const DB_HOST = process.env.DB_HOST || '31.97.61.5';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'rto';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'rto_db';

// Backup configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 30; // Keep last 30 backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
}

/**
 * Create a database backup using mysqldump
 */
const createBackup = () => {
  return new Promise((resolve, reject) => {
    // Create filename with timestamp in IST
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const timestamp = istDate.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
      String(istDate.getHours()).padStart(2, '0') + '-' +
      String(istDate.getMinutes()).padStart(2, '0') + '-' +
      String(istDate.getSeconds()).padStart(2, '0');
    
    const filename = `rto_db_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Build mysqldump command
    // Try to find mysqldump in common locations or use PATH
    const mysqldumpPaths = [
      'mysqldump', // Try PATH first
      '/usr/bin/mysqldump',
      '/usr/local/bin/mysqldump',
      '/opt/homebrew/bin/mysqldump', // macOS Homebrew
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe', // Windows
      'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe', // Windows
    ];

    // Use the first available mysqldump or default to 'mysqldump'
    const mysqldump = mysqldumpPaths[0]; // For now, use PATH version
    // In production, you might want to check which one exists
    
    // Escape password and other values for shell safety
    const escapedPassword = DB_PASSWORD.replace(/'/g, "'\\''");
    const mysqldumpCmd = `${mysqldump} -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p'${escapedPassword}' ${DB_NAME} > "${filepath}" 2>&1`;

    console.log(`🔄 Starting database backup at ${istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST...`);
    console.log(`📦 Backup file: ${filename}`);
    console.log(`🔗 Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);

    exec(mysqldumpCmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Backup failed: ${error.message}`);
        reject(error);
        return;
      }

      if (stderr && !stderr.includes('Warning')) {
        console.error(`⚠️  Backup warning: ${stderr}`);
      }

      // Check if file was created and has content
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        if (stats.size > 0) {
          console.log(`✅ Backup completed successfully!`);
          console.log(`📊 File size: ${fileSizeMB} MB`);
          console.log(`📁 Location: ${filepath}`);
          resolve({ filepath, filename, size: stats.size });
        } else {
          console.error(`❌ Backup file is empty`);
          fs.unlinkSync(filepath);
          reject(new Error('Backup file is empty'));
        }
      } else {
        console.error(`❌ Backup file was not created`);
        reject(new Error('Backup file was not created'));
      }
    });
  });
};

/**
 * Clean up old backups, keeping only the most recent MAX_BACKUPS
 */
const cleanupOldBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('rto_db_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by modification time, newest first

    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      let deletedCount = 0;
      let freedSpace = 0;

      filesToDelete.forEach(file => {
        try {
          const stats = fs.statSync(file.path);
          fs.unlinkSync(file.path);
          deletedCount++;
          freedSpace += stats.size;
          console.log(`🗑️  Deleted old backup: ${file.name}`);
        } catch (err) {
          console.error(`⚠️  Failed to delete ${file.name}: ${err.message}`);
        }
      });

      if (deletedCount > 0) {
        const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
        console.log(`✅ Cleanup completed: Deleted ${deletedCount} old backup(s), freed ${freedSpaceMB} MB`);
      }
    } else {
      console.log(`ℹ️  No cleanup needed. Current backups: ${files.length}/${MAX_BACKUPS}`);
    }
  } catch (error) {
    console.error(`❌ Error during cleanup: ${error.message}`);
  }
};

/**
 * Main backup function
 */
const runBackup = async () => {
  try {
    const result = await createBackup();
    cleanupOldBackups();
    return result;
  } catch (error) {
    console.error(`❌ Backup process failed: ${error.message}`);
    throw error;
  }
};

// If run directly (not imported), execute backup
if (require.main === module) {
  runBackup()
    .then(() => {
      console.log('✅ Backup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Backup script failed:', error);
      process.exit(1);
    });
}

module.exports = { runBackup, createBackup, cleanupOldBackups };

