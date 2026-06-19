import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

// Only draft jobs can be edited; categoryId and zoneId can also be changed
export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, [] as const)) {}
