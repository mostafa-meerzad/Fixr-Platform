import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobStatus, User, UserRole } from '@prisma/client';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── Homeowner: create draft ───────────────────────────────────────────────

  @Post()
  @Roles(UserRole.HOMEOWNER)
  @ApiOperation({ summary: 'Create a job as DRAFT' })
  create(@CurrentUser() user: User, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user, dto);
  }

  // ─── Homeowner: edit draft ─────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.HOMEOWNER)
  @ApiOperation({ summary: 'Update a draft job' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, user, dto);
  }

  // ─── Homeowner: publish draft → OPEN ──────────────────────────────────────

  @Post(':id/publish')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft job (DRAFT → OPEN)' })
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.publish(id, user);
  }

  // ─── Homeowner: cancel ────────────────────────────────────────────────────

  @Post(':id/cancel')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a job (homeowner only)' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CancelJobDto,
  ) {
    return this.jobsService.cancel(id, user, dto);
  }

  // ─── Homeowner: confirm completion (COMPLETION_REQUESTED → COMPLETED) ─────

  @Post(':id/complete')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm job completion (homeowner)' })
  confirmComplete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.transition(id, user, JobStatus.COMPLETED);
  }

  // ─── Expert: status transitions ───────────────────────────────────────────

  @Post(':id/en-route')
  @Roles(UserRole.EXPERT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expert marks themselves as en route (ASSIGNED → EN_ROUTE)' })
  markEnRoute(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.transition(id, user, JobStatus.EN_ROUTE);
  }

  @Post(':id/arrived')
  @Roles(UserRole.EXPERT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expert marks arrival (EN_ROUTE → ARRIVED)' })
  markArrived(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.transition(id, user, JobStatus.ARRIVED);
  }

  @Post(':id/start')
  @Roles(UserRole.EXPERT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expert starts the job (ARRIVED → IN_PROGRESS)' })
  markInProgress(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.transition(id, user, JobStatus.IN_PROGRESS);
  }

  @Post(':id/request-completion')
  @Roles(UserRole.EXPERT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expert requests completion (IN_PROGRESS → COMPLETION_REQUESTED)' })
  requestCompletion(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.transition(id, user, JobStatus.COMPLETION_REQUESTED);
  }

  // ─── Homeowner: delete draft ───────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft job' })
  deleteDraft(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.deleteDraft(id, user);
  }

  // ─── Shared: list jobs ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary:
      'List jobs. Homeowner sees their own jobs; Expert sees their active/completed jobs; Admin sees all.',
  })
  findAll(@CurrentUser() user: User, @Query() query: QueryJobsDto) {
    return this.jobsService.findAll(user, query);
  }

  // ─── Expert: browse open jobs in their zones ──────────────────────────────

  @Get('browse')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Browse open jobs in the expert\'s service zones' })
  browse(@CurrentUser() user: User, @Query() query: QueryJobsDto) {
    return this.jobsService.browseForExpert(user, query);
  }

  // ─── Shared: single job ───────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job (access-controlled)' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.findOne(id, user);
  }
}
