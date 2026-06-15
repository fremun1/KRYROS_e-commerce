import { PartialType } from '@nestjs/swagger';
import { CreateHomePageSectionDto } from './create-homepage-section.dto';

export class UpdateHomePageSectionDto extends PartialType(CreateHomePageSectionDto) {}
