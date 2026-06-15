import { PartialType } from '@nestjs/swagger';
import { CreateCreditPlanDto } from './create-credit-plan.dto';

export class UpdateCreditPlanDto extends PartialType(CreateCreditPlanDto) {}
