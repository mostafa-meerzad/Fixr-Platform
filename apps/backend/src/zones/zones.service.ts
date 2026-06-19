import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZoneDto) {
    const existing = await this.prisma.zone.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A zone with this name already exists.');
    return this.prisma.zone.create({ data: dto });
  }

  findAll(activeOnly = true) {
    return this.prisma.zone.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.findOrFail(id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    return this.prisma.zone.update({ where: { id }, data: { isActive: false } });
  }

  private async findOrFail(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`Zone ${id} not found.`);
    return zone;
  }
}
