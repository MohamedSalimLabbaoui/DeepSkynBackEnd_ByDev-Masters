import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Likes')
@ApiBearerAuth('JWT-auth')
@Controller('likes')
@UseGuards(KeycloakAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId/toggle')
  @ApiOperation({
    summary: 'Toggle like',
    description: 'Like ou unlike un post',
  })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiQuery({ name: 'type', required: false, description: 'Type de réaction (like, haha, love, etc.)' })
  @ApiResponse({ status: 200, description: 'Like togglé' })
  @ApiResponse({ status: 404, description: 'Post non trouvé' })
  async toggle(
    @CurrentUser('sub') userId: string,
    @Param('postId') postId: string,
    @Query('type') type?: string,
  ) {
    return this.likesService.toggle(userId, postId, type || 'like');
  }

  @Post(':postId')
  @ApiOperation({
    summary: 'Liker un post',
    description: 'Ajoute un like à un post',
  })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiResponse({ status: 201, description: 'Post liké' })
  @ApiResponse({ status: 409, description: 'Déjà liké' })
  async like(
    @CurrentUser('sub') userId: string,
    @Param('postId') postId: string,
  ) {
    return this.likesService.like(userId, postId);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unliker un post',
    description: "Retire le like d'un post",
  })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiResponse({ status: 204, description: 'Like retiré' })
  @ApiResponse({ status: 404, description: 'Like non trouvé' })
  async unlike(
    @CurrentUser('sub') userId: string,
    @Param('postId') postId: string,
  ) {
    return this.likesService.unlike(userId, postId);
  }

  @Get('post/:postId')
  @ApiOperation({
    summary: "Likes d'un post",
    description: "Récupère la liste des likes d'un post",
  })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByPost(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.likesService.findByPost(postId, page || 1, limit || 50);
  }

  @Get('check/:postId')
  @ApiOperation({
    summary: 'Vérifier le like',
    description: "Vérifie si l'utilisateur a liké un post",
  })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiResponse({ status: 200, description: 'Statut du like' })
  async hasLiked(
    @CurrentUser('sub') userId: string,
    @Param('postId') postId: string,
  ) {
    const liked = await this.likesService.hasLiked(userId, postId);
    return { liked };
  }
}
