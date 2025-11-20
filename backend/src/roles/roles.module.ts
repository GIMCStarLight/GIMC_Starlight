import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { UserAuth } from '../database/entities/user-auth.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { RolePermission } from '../database/entities/role-permission.entity';
import { Permission } from '../database/entities/permission.entity';
import { PermissionService } from '../auth/services/permission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [Role, UserRole, UserAuth, UserProfile, RolePermission, Permission],
      'postgres',
    ),
  ],
  controllers: [RolesController],
  providers: [RolesService, PermissionService],
  exports: [RolesService],
})
export class RolesModule {}
