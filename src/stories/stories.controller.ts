import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

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
}
