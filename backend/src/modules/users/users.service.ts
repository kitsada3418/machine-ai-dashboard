import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

export type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: this.publicUserSelect(),
    });
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.publicUserSelect(),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateUserDto, actorId: string): Promise<PublicUser> {
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
      },
      select: this.publicUserSelect(),
    });

    await this.auditService.log(
      actorId,
      'USER_CREATED',
      `User ${user.email} created`,
    );
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
  ): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (dto.email && dto.email !== existing.email) {
      await this.assertEmailAvailable(dto.email);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        role: dto.role,
        ...(dto.password
          ? {
              passwordHash: await argon2.hash(dto.password, {
                type: argon2.argon2id,
              }),
            }
          : {}),
      },
      select: this.publicUserSelect(),
    });

    await this.auditService.log(
      actorId,
      'USER_UPDATED',
      `User ${user.email} updated`,
    );
    return user;
  }

  async remove(id: string, actorId: string): Promise<{ success: boolean }> {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });
    await this.auditService.log(
      actorId,
      'USER_DELETED',
      `User ${existing.email} deleted`,
    );
    return { success: true };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }
  }

  private publicUserSelect() {
    return {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
