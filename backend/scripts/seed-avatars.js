const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...vals] = trimmed.split('=');
    if (key && vals.length > 0) {
      let val = vals.join('=').trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  });
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const res = await client.query('SELECT id, name, email, "avatarUrl" FROM "Agent";');
  console.log('Agents in database:', res.rows.length);

  const avatars = [
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-afro.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-curly.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741447/swish_avatars/avatar-bob.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741448/swish_avatars/avatar-bun.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741448/swish_avatars/avatar-eyepatch.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741449/swish_avatars/avatar-hijab.png',
    'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741450/swish_avatars/avatar-mustache.png',
  ];

  for (let i = 0; i < res.rows.length; i++) {
    const agent = res.rows[i];
    if (!agent.avatarUrl) {
      const assigned = avatars[i % avatars.length];
      await client.query('UPDATE "Agent" SET "avatarUrl" = $1 WHERE id = $2;', [assigned, agent.id]);
      console.log(`Updated agent ${agent.name} (${agent.email}) -> ${assigned}`);
    } else {
      console.log(`Agent ${agent.name} already has avatar: ${agent.avatarUrl}`);
    }
  }

  await client.end();
  console.log('Finished updating agents with Cloudinary avatars!');
}

run().catch(console.error);
