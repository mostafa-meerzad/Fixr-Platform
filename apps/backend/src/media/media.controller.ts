import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

const fileSchema = {
  type: 'object',
  properties: { file: { type: 'string', format: 'binary' } },
};

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile avatar (any role)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileSchema })
  async uploadAvatar(@CurrentUser() user: User, @Req() req: FastifyRequest) {
    const upload = await (req as any).file();
    if (!upload) throw new BadRequestException('No file provided.');
    const buffer = await upload.toBuffer();
    return this.mediaService.uploadAvatar(user, { buffer, mimetype: upload.mimetype, size: buffer.length });
  }

  @Post('expert/:target')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Upload expert verification media (selfie, tazkira, shop, license)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileSchema })
  @ApiParam({ name: 'target', enum: ['selfie', 'tazkira_front', 'tazkira_back', 'shop_image', 'work_license'] })
  async uploadExpertMedia(
    @CurrentUser() user: User,
    @Param('target') target: string,
    @Req() req: FastifyRequest,
  ) {
    const allowed = ['selfie', 'tazkira_front', 'tazkira_back', 'shop_image', 'work_license'];
    if (!allowed.includes(target)) {
      throw new BadRequestException(`Invalid target. Allowed: ${allowed.join(', ')}`);
    }
    const upload = await (req as any).file();
    if (!upload) throw new BadRequestException('No file provided.');
    const buffer = await upload.toBuffer();
    return this.mediaService.uploadExpertMedia(user, target as any, { buffer, mimetype: upload.mimetype, size: buffer.length });
  }

  @Post('jobs/:jobId')
  @Roles(UserRole.HOMEOWNER)
  @ApiOperation({ summary: 'Upload image or video to a draft job (max 8 images, 1 video)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileSchema })
  @ApiParam({ name: 'jobId' })
  async uploadJobMedia(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
    @Req() req: FastifyRequest,
  ) {
    const upload = await (req as any).file();
    if (!upload) throw new BadRequestException('No file provided.');
    const buffer = await upload.toBuffer();
    return this.mediaService.uploadJobMedia(user, jobId, { buffer, mimetype: upload.mimetype, size: buffer.length });
  }

  @Delete('jobs/media/:mediaId')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a media item from a draft job' })
  @ApiParam({ name: 'mediaId' })
  deleteJobMedia(@CurrentUser() user: User, @Param('mediaId') mediaId: string) {
    return this.mediaService.deleteJobMedia(user, mediaId);
  }
}
