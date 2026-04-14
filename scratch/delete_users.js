const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'J98761234!',
    database: process.env.DB_DATABASE || 'pilacon',
  });

  try {
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
    const [result] = await connection.execute("DELETE FROM user");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Successfully deleted ${result.affectedRows} users. Table is now empty.`);
  } catch (error) {
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
    if (error.code === 'ER_NO_SUCH_TABLE') {
        try {
            await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
            const [result] = await connection.execute("DELETE FROM User");
            await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
            console.log(`Successfully deleted ${result.affectedRows} users (Table: User). Table is now empty.`);
        } catch (innerError) {
            console.error('Failed to delete users:', innerError.message);
        }
    } else {
        console.error('Failed to delete users:', error.message);
    }
  } finally {
    await connection.end();
  }
}

main();
