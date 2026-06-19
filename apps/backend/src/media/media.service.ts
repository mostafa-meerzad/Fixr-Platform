import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { User, JobStatus } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGES_PER_JOB = 8;

type MediaTarget =
  | 'selfie'
  | 'tazkira_front'
  | 'tazkira_back'
  | 'shop_image'
  | 'work_license'
  | 'job_image'
  | 'job_video';

@Injectable()
export class MediaService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadExpertMedia(
    user: User,
    target: MediaTarget,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    const isVideo = target === 'job_video';
    this.validateFile(file, isVideo);

    const folder = `fixr/experts/${user.id}`;
    const publicId = `${folder}/${target}_${Date.now()}`;

    const url = await this.uploadToCloudinary(file.buffer, publicId, isVideo);

    // Update the corresponding field on the expert profile
    const fieldMap: Partial<Record<MediaTarget, string>> = {
      selfie: 'selfieUrl',
      tazkira_front: 'tazkiraFrontUrl',
      tazkira_back: 'tazkiraBackUrl',
      shop_image: 'shopImageUrl',
      work_license: 'workLicenseUrl',
    };

    const field = fieldMap[target];
    if (field) {
      await this.prisma.expertProfile.update({
        where: { userId: user.id },
        data: { [field]: url },
      });
    }

    return { url };
  }

  async uploadAvatar(user: User, file: { buffer: Buffer; mimetype: string; size: number }) {
    this.validateFile(file, false);
    const publicId = `fixr/avatars/${user.id}`;
    const url = await this.uploadToCloudinary(file.buffer, publicId, false);
    await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    return { url };
  }

  async uploadJobMedia(
    user: User,
    jobId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    if (job.homeownerId !== user.id) throw new ForbiddenException('You do not own this job.');
    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException('Media can only be added to draft jobs.');
    }

    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    this.validateFile(file, isVideo);

    if (!isVideo) {
      const imageCount = await this.prisma.jobMedia.count({
        where: { jobId, type: 'image' },
      });
      if (imageCount >= MAX_IMAGES_PER_JOB) {
        throw new BadRequestException(`A job can have at most ${MAX_IMAGES_PER_JOB} images.`);
      }
    }

    const folder = `fixr/jobs/${jobId}`;
    const publicId = `${folder}/${isVideo ? 'video' : 'image'}_${Date.now()}`;
    const url = await this.uploadToCloudinary(file.buffer, publicId, isVideo);

    const media = await this.prisma.jobMedia.create({
      data: { jobId, url, type: isVideo ? 'video' : 'image' },
    });

    return media;
  }

  async deleteJobMedia(user: User, mediaId: string) {
    const media = await this.prisma.jobMedia.findUnique({
      where: { id: mediaId },
      include: { job: true },
    });
    if (!media) throw new NotFoundException('Media not found.');
    if (media.job.homeownerId !== user.id) throw new ForbiddenException('Access denied.');
    if (media.job.status !== JobStatus.DRAFT) {
      throw new BadRequestException('Media can only be removed from draft jobs.');
    }

    // Extract public_id from URL and destroy on Cloudinary
    const publicId = this.extractPublicId(media.url);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: media.type === 'video' ? 'video' : 'image',
    });

    await this.prisma.jobMedia.delete({ where: { id: mediaId } });
    return { success: true };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private validateFile(
    file: { mimetype: string; size: number },
    isVideo: boolean,
  ) {
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`,
      );
    }
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File too large. Maximum size: ${maxBytes / (1024 * 1024)} MB.`,
      );
    }
  }

  private uploadToCloudinary(
    buffer: Buffer,
    publicId: string,
    isVideo: boolean,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: isVideo ? 'video' : 'image',
          overwrite: true,
          transformation: isVideo
            ? undefined
            : [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(new InternalServerErrorException('Failed to upload media.'));
          } else {
            resolve(result.secure_url);
          }
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  private extractPublicId(url: string): string {
    // https://res.cloudinary.com/<cloud>/image/upload/v123/fixr/jobs/...
    const parts = url.split('/upload/');
    if (parts.length < 2) return url;
    return parts[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
  }
}
