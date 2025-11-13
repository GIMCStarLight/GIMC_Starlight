const { DataSource } = require('typeorm');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  username: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'gimcstar_system',
  synchronize: false,
  logging: true,
  entities: [
    'dist/src/database/entities/kol-list.entity.js',
    'dist/src/database/entities/user-auth.entity.js',
    'dist/src/database/entities/user-profile.entity.js',
    'dist/src/database/entities/permissions.entity.js',
    'dist/src/database/entities/tag.entity.js'
  ],
  migrations: ['dist/src/database/migrations/*.js'],
  migrationsTableName: 'migrations',
  timezone: '+08:00',
  charset: 'utf8mb4',
});

module.exports = { AppDataSource };