import { PartialType } from '@nestjs/swagger';
import { CreateKolListDto } from './create-kol-list.dto';

export class UpdateKolListDto extends PartialType(CreateKolListDto) {}
