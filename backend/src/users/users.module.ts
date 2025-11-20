import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserAuth } from '../database/entities/user-auth.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Role } from '../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAuth, UserProfile, UserRole, Role], 'postgres'),
    AuthModule,
    CommonModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
