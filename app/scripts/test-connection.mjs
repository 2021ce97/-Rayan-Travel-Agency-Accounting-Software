/**
 * Comprehensive Supabase connectivity diagnostic
 * Tests multiple connection options to find one that works
 */
import pkg from "pg";
const { Client } = pkg;
import net from "net";

const PASSWORD = "Travelrayan12";
const PROJECT_REF = "ciyekagugzwsuklaafgq";

const connections = [
  {
    name: "Session Pooler (aws-1-ap-south-1) Port 5432",
    host: `aws-1-ap-south-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "Session Pooler (aws-0-ap-south-1) Port 5432",
    host: `aws-0-ap-south-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "Session Pooler Port 6543",
    host: `aws-1-ap-south-1.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  },
];

async function testTCPPort(host, port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const timer = setTimeout(() => { sock.destroy(); resolve(false); }, 5000);
    sock.connect(port, host, () => { clearTimeout(timer); sock.destroy(); resolve(true); });
    sock.on("error", () => { clearTimeout(timer); resolve(false); });
  });
}

for (const conn of connections) {
  console.log(`\nTesting: ${conn.name}`);
  const tcpOk = await testTCPPort(conn.host, conn.port);
  console.log(`  TCP reachable: ${tcpOk ? "✅ YES" : "❌ NO"}`);
  
  if (!tcpOk) continue;
  
  const client = new Client({ ...conn, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const r = await client.query("SELECT current_database(), current_user");
    console.log(`  DB: ${r.rows[0].current_database}, User: ${r.rows[0].current_user}`);
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' ORDER BY table_name
    `);
    console.log(`  ✅ SUCCESS! Tables found: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      tables.rows.forEach(r => console.log(`     - ${r.table_name}`));
    }
    await client.end();
    console.log(`\n✅ Working connection string:\npostgresql://${conn.user}:${PASSWORD}@${conn.host}:${conn.port}/${conn.database}`);
    break;
  } catch (err) {
    console.log(`  ❌ SQL Error: ${err.message}`);
    try { await client.end(); } catch {}
  }
}
