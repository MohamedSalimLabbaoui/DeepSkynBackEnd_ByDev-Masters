import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
@UseGuards(KeycloakAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter un commentaire', description: 'Ajoute un commentaire à un post' })
  @ApiResponse({ status: 201, description: 'Commentaire créé' })
  @ApiResponse({ status: 404, description: 'Post non trouvé' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, createCommentDto);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Commentaires d\'un post', description: 'Récupère les commentaires d\'un post' })
  @ApiParam({ name: 'postId', description: 'ID du post' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByPost(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findByPost(postId, page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un commentaire', description: 'Récupère un commentaire par ID' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 200, description: 'Détail du commentaire' })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un commentaire', description: 'Modifie un commentaire (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 200, description: 'Commentaire modifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, userId, updateCommentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un commentaire', description: 'Supprime un commentaire (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 204, description: 'Commentaire supprimé' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.commentsService.remove(id, userId);
  }
}
