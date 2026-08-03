import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

const mockUser: User = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@smartfactory.local',
  passwordHash: 'hashed-password',
  role: Role.ADMIN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return values[key];
            }),
          },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return token pair and public user for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'admin@smartfactory.local',
        password: 'SmartFactory@123',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(auditService.log).toHaveBeenCalledWith(
        mockUser.id,
        'LOGIN',
        expect.stringContaining('logged in'),
      );
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'ghost@smartfactory.local',
          password: 'SmartFactory@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'admin@smartfactory.local',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should issue a new token pair for an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refresh(mockUser.id);

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException when user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('missing-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should write an audit log and return success', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.logout(mockUser.id);

      expect(result).toEqual({ success: true });
      expect(auditService.log).toHaveBeenCalledWith(
        mockUser.id,
        'LOGOUT',
        expect.stringContaining('logged out'),
      );
    });
  });

  describe('me', () => {
    it('should return public profile without password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.me(mockUser.id);

      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
