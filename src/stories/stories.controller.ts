import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto, CreateStoryCommentDto } from './dto/create-story.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';

@ApiTags('Stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle story' })
  create(@Req() req: any, @Body() createStoryDto: CreateStoryDto) {
    const userId = createStoryDto.userId || req.user?.id || req.user?.sub || '89324390-127f-48c4-b382-2aef40f76add';
    return this.storiesService.create(userId, createStoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer les stories actives' })
  findAll(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.findAllActive(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all stories for a specific user' })
  getUserStories(@Param('userId') userId: string) {
    return this.storiesService.getUserStories(userId);
  }

  // ─── Story Likes ───
  @Post(':id/like')
  @UseGuards(KeycloakAuthGuard)
  @ApiOperation({ summary: 'Toggle like on a story' })
  toggleLike(@Req() req: any, @Param('id') storyId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.toggleLike(storyId, userId);
  }

  // ─── Story Comments ───
  @Post(':id/comments')
  @UseGuards(KeycloakAuthGuard)
  @ApiOperation({ summary: 'Add a comment to a story' })
  addComment(@Req() req: any, @Param('id') storyId: string, @Body() body: { comment: string }) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.addComment(userId, { storyId, comment: body.comment });
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a story' })
  getComments(@Param('id') storyId: string) {
    return this.storiesService.getComments(storyId);
  }

  @Delete('comments/:commentId')
  @UseGuards(KeycloakAuthGuard)
  @ApiOperation({ summary: 'Delete a story comment' })
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.deleteComment(commentId, userId);
  }

  // ─── Story Highlights ───
  @Get('highlights/:userId')
  @ApiOperation({ summary: 'Get story highlights for a user' })
  getUserHighlights(@Param('userId') userId: string) {
    return this.storiesService.getUserHighlights(userId);
  }

  @Post(':id/highlight')
  @UseGuards(KeycloakAuthGuard)
  @ApiOperation({ summary: 'Mark a story as highlight' })
  saveAsHighlight(@Req() req: any, @Param('id') storyId: string, @Body() body: { highlightTitle?: string }) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.saveStoryAsHighlight(storyId, userId, body.highlightTitle);
  }

  @Delete(':id/highlight')
  @UseGuards(KeycloakAuthGuard)
  @ApiOperation({ summary: 'Remove story from highlights' })
  removeFromHighlight(@Req() req: any, @Param('id') storyId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.storiesService.removeFromHighlight(storyId, userId);
  }

  // ─── Free Music for Stories ───
  @Get('music/free')
  @ApiOperation({ summary: 'Get free royalty-free music for stories' })
  getFreeMusic() {
    return this.storiesService.getFreeMusic();
  }

  @Get('music/search')
  @ApiOperation({ summary: 'Search for free music' })
  searchFreeMusic(@Param('query') query?: string) {
    return this.storiesService.getFreeMusic(query || 'royalty free', 10);
  }
}
