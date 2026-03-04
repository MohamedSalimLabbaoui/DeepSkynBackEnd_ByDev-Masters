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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, FlagPostDto } from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Posts')
@ApiBearerAuth('JWT-auth')
@Controller('posts')
@UseGuards(KeycloakAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un post',
    description: 'Publie un nouveau post dans le feed',
  })
  @ApiResponse({ status: 201, description: 'Post créé avec succès' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer le feed',
    description: 'Récupère tous les posts paginés',
  })
  @ApiResponse({ status: 200, description: 'Liste des posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.findAll(page || 1, limit || 20, userId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: "Posts d'un utilisateur",
    description: "Récupère les posts d'un utilisateur spécifique",
  })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.findByUser(
      userId,
      page || 1,
      limit || 20,
      currentUserId,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Mes posts',
    description: "Récupère les posts de l'utilisateur connecté",
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyPosts(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.findByUser(userId, page || 1, limit || 20, userId);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAllForAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('reported') reported?: string,
    @Query('userId') userId?: string,
  ) {
    return this.postsService.findAllForAdmin(page || 1, limit || 20, {
      reported: reported === 'true',
      userId,
    });
  }

  @Patch('admin/:id/flag')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async flagPost(@Param('id') id: string, @Body() flagDto: FlagPostDto) {
    return this.postsService.moderatePost(id, flagDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail d'un post",
    description: 'Récupère un post par son ID',
  })
  @ApiParam({ name: 'id', description: 'ID du post' })
  @ApiResponse({ status: 200, description: 'Détail du post' })
  @ApiResponse({ status: 404, description: 'Post non trouvé' })
  async findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un post',
    description: 'Modifie un post existant (propriétaire uniquement)',
  })
  @ApiParam({ name: 'id', description: 'ID du post' })
  @ApiResponse({ status: 200, description: 'Post modifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, userId, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un post',
    description: 'Supprime un post (propriétaire uniquement)',
  })
  @ApiParam({ name: 'id', description: 'ID du post' })
  @ApiResponse({ status: 204, description: 'Post supprimé' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.remove(id, userId);
  }
}
