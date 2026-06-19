import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('jobs/:jobId/review')
  @ApiOperation({ summary: 'Submit a review for a completed job (48-hour window)' })
  create(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(jobId, user, dto);
  }

  @Get('jobs/:jobId/review')
  @ApiOperation({ summary: 'Get the review for a completed job' })
  findForJob(@Param('jobId') jobId: string) {
    return this.reviewsService.findForJob(jobId);
  }

  @Get('users/:userId/reviews')
  @ApiOperation({ summary: 'Get all reviews received by a user' })
  findForUser(@Param('userId') userId: string) {
    return this.reviewsService.findForUser(userId);
  }
}
