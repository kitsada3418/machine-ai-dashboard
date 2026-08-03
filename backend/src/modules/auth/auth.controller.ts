import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import type { LoginResult, PublicUser, TokenPair } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for a new token pair' })
  refresh(@CurrentUser() user: AuthenticatedUser): Promise<TokenPair> {
    return this.authService.refresh(user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current session (records audit log)' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(user.userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.authService.me(user.userId);
  }
}
