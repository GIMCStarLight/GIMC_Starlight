import 'dotenv/config';
import { DataSource } from 'typeorm';
import { MYSQL_ENTITIES } from '../src/database/entities';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    username: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
    entities: MYSQL_ENTITIES,
    synchronize: true,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('Local RBAC and work-order tables are ready.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
