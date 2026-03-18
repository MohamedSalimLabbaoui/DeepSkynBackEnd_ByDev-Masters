import { Body, Controller, Get, Patch, Post, UseGuards, NotFoundException, BadRequestException, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { SupabaseService } from '../analysis/services/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
@UseGuards(KeycloakAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly supabaseService: SupabaseService
    ) { }

    @Get('me')
    async getProfile(@CurrentUser('email') email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    @Patch('me')
    async updateProfile(
        @CurrentUser('email') email: string,
        @Body() updateUserDto: UpdateUserDto
    ) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.usersService.update(user.id, updateUserDto);
    }

    @Post('avatar3d')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar3D(
        @CurrentUser('email') email: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Aucun fichier fourni');
        }

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        const result = await this.supabaseService.upload3DModel(file, user.id);
        return this.usersService.update(user.id, { avatar3D: result.url });
    }

    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles('admin')
    async getAllForAdmin(@Query() query: AdminUsersQueryDto) {
        return this.usersService.findAllForAdmin(query);
    }

    @Get('admin/:id')
    @UseGuards(RolesGuard)
    @Roles('admin')
    async getOneForAdmin(@Param('id') id: string) {
        const user = await this.usersService.findOneForAdmin(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    @Patch('admin/:id/status')
    @UseGuards(RolesGuard)
    @Roles('admin')
    async updateStatusForAdmin(
        @Param('id') id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.usersService.updateStatus(id, dto.isActive);
    }
}
