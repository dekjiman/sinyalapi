import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { createSuccessResponse } from '@/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    const result = await this.authService.register(body.email, body.password, body.name);
    return createSuccessResponse(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.login(body.email, body.password);
    return createSuccessResponse(result);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    const result = await this.authService.forgotPassword(body.email);
    return createSuccessResponse(result);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    const result = await this.authService.resetPassword(body.token, body.newPassword);
    return createSuccessResponse(result);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: { email: string; name: string; googleId: string }) {
    const result = await this.authService.googleLogin(body);
    return createSuccessResponse(result);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  async getProfile(@Request() req: any) {
    return createSuccessResponse(req.user);
  }
}
