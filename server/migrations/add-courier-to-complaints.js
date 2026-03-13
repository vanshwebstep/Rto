const mysql = require('mysql2/promise');

const addCourierToComplaints = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '31.97.61.5',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'rto',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rto_db',
  });

  try {
    // Check if courier column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'complaints' 
       AND COLUMN_NAME = 'courier'`,
      [process.env.DB_NAME || 'rto_db'],
    );

    if (columns.length === 0) {
      // Add courier column
      await connection.execute(
        `ALTER TABLE complaints 
         ADD COLUMN courier VARCHAR(255) NULL AFTER mailSubject`,
      );
      console.log('✅ Added courier column to complaints table');
    } else {
      console.log('ℹ️  courier column already exists in complaints table');
    }
  } catch (error) {
    console.error('❌ Error adding courier column:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// Run migration if called directly
if (require.main === module) {
  addCourierToComplaints()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addCourierToComplaints;

