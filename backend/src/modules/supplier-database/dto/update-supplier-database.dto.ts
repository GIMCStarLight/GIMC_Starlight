import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDatabaseDto } from './create-supplier-database.dto';

export class UpdateSupplierDatabaseDto extends PartialType(
  CreateSupplierDatabaseDto,
) {}
