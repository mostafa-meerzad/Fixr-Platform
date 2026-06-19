import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('jobs/:jobId/token')
  @ApiOperation({
    summary:
      'Get a Stream Chat token + channel ID for a job. Only available after bid acceptance.',
  })
  @ApiParam({ name: 'jobId' })
  getChatToken(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.chatService.getChatToken(jobId, user);
  }
}
