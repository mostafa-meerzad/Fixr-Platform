import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-fastify';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
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
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    this.requireFile(file);
    return this.mediaService.uploadAvatar(user, file);
  }

  @Post('expert/:target')
  @Roles(UserRole.EXPERT)
  @ApiOperation({ summary: 'Upload expert verification media (selfie, tazkira, shop, license)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileSchema })
  @ApiParam({ name: 'target', enum: ['selfie', 'tazkira_front', 'tazkira_back', 'shop_image', 'work_license'] })
  @UseInterceptors(FileInterceptor('file'))
  uploadExpertMedia(
    @CurrentUser() user: User,
    @Param('target') target: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.requireFile(file);
    const allowed = ['selfie', 'tazkira_front', 'tazkira_back', 'shop_image', 'work_license'];
    if (!allowed.includes(target)) {
      throw new BadRequestException(`Invalid target. Allowed: ${allowed.join(', ')}`);
    }
    return this.mediaService.uploadExpertMedia(user, target as any, file);
  }

  @Post('jobs/:jobId')
  @Roles(UserRole.HOMEOWNER)
  @ApiOperation({ summary: 'Upload image or video to a draft job (max 8 images, 1 video)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileSchema })
  @ApiParam({ name: 'jobId' })
  @UseInterceptors(FileInterceptor('file'))
  uploadJobMedia(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.requireFile(file);
    return this.mediaService.uploadJobMedia(user, jobId, file);
  }

  @Delete('jobs/media/:mediaId')
  @Roles(UserRole.HOMEOWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a media item from a draft job' })
  @ApiParam({ name: 'mediaId' })
  deleteJobMedia(@CurrentUser() user: User, @Param('mediaId') mediaId: string) {
    return this.mediaService.deleteJobMedia(user, mediaId);
  }

  private requireFile(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file provided.');
  }
}
