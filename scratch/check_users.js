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
    const [rows] = await connection.execute(
      "SELECT id, name, nickname, role, provider FROM user ORDER BY id DESC LIMIT 5"
    );
    console.log("Last 5 users in DB:");
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
        try {
            const [rows] = await connection.execute(
                "SELECT id, name, nickname, role, provider FROM User ORDER BY id DESC LIMIT 5"
            );
            console.log("Last 5 users in DB (Table: User):");
            console.log(JSON.stringify(rows, null, 2));
        } catch (innerError) {
            console.error('Failed to query users:', innerError.message);
        }
    } else {
        console.error('Failed to query users:', error.message);
    }
  } finally {
    await connection.end();
  }
}

main();
