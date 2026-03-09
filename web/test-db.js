const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_kv3uQsLc7HlI@ep-plain-dream-aia8vqn1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        console.log('Attempting to connect to:', connectionString.replace(/:[^:]*@/, ':****@'));
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT current_database(), now();');
        console.log('DB Check:', res.rows[0]);
        await client.end();
        console.log('Connection closed.');
    } catch (err) {
        console.error('Connection error details:');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

testConnection();
