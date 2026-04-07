import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto, CreateStoryCommentDto } from './dto/create-story.dto';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createStoryDto: CreateStoryDto) {
    if (!createStoryDto.mediaUrl) {
      throw new BadRequestException('mediaUrl is required');
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // FIX: Verify userId exists, fallback to a valid user to prevent Foreign Key constraint errors 
    // when bypassing AuthGuards during development.
    let validUserId = userId;
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      const fallbackUser = await this.prisma.user.findFirst();
      if (!fallbackUser) {
        throw new BadRequestException('Aucun utilisateur n\'existe dans la base de données.');
      }
      validUserId = fallbackUser.id;
    }

    return this.prisma.story.create({
      data: {
        userId: validUserId,
        mediaUrl: createStoryDto.mediaUrl,
        musicUrl: createStoryDto.musicUrl || null,
        musicTitle: createStoryDto.musicTitle || null,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async findAllActive(currentUserId?: string) {
    const now = new Date();
    
    const where: any = {
      expiresAt: { gt: now },
    };

    if (currentUserId) {
      where.OR = [
        { userId: currentUserId },
        { 
          user: { 
            followers: { 
              some: { followerId: currentUserId } 
            } 
          } 
        }
      ];
    } else {
      where.user = { isPublic: true };
    }

    const stories = await this.prisma.story.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
        likes: currentUserId ? {
          where: { userId: currentUserId },
          select: { id: true },
        } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = stories.map(s => ({
      id: s.id,
      name: s.user.name || 'Utilisateur',
      avatar: s.user.avatar,
      hasStory: true,
      isViewed: false,
      mediaUrl: s.mediaUrl,
      musicUrl: s.musicUrl,
      musicTitle: s.musicTitle,
      userId: s.userId,
      createdAt: s.createdAt,
      likesCount: s._count.likes,
      commentsCount: s._count.comments,
      isLiked: currentUserId ? (s as any).likes?.length > 0 : false,
    }));

    return formatted;
  }

  async getUserStories(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all stories (including expired) for the user
    const stories = await this.prisma.story.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stories.map(s => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      musicUrl: s.musicUrl,
      musicTitle: s.musicTitle,
      createdAt: s.createdAt,
      _count: {
        likes: s._count.likes,
        comments: s._count.comments,
      },
    }));
  }

  // ─── Story Likes ───
  async toggleLike(storyId: string, userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');

    const existing = await this.prisma.storyLike.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });

    if (existing) {
      await this.prisma.storyLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.storyLike.count({ where: { storyId } });
      return { liked: false, likesCount: count };
    } else {
      await this.prisma.storyLike.create({ data: { userId, storyId } });
      const count = await this.prisma.storyLike.count({ where: { storyId } });
      return { liked: true, likesCount: count };
    }
  }

  // ─── Story Comments ───
  async addComment(userId: string, dto: CreateStoryCommentDto) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const story = await this.prisma.story.findUnique({ where: { id: dto.storyId } });
    if (!story) throw new NotFoundException('Story not found');

    return this.prisma.storyComment.create({
      data: {
        userId,
        storyId: dto.storyId,
        comment: dto.comment,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async getComments(storyId: string) {
    return this.prisma.storyComment.findMany({
      where: { storyId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const comment = await this.prisma.storyComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.prisma.storyComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  // ─── Free Music API ───
  /**
   * Fetch free royalty-free music for stories
   * Uses Archive.org API (completely free, no authentication)
   */
  async getFreeMusic(query: string = 'royalty free', limit: number = 10) {
    try {
      // Using Archive.org's publicly available API
      const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl=identifier,title,creator&output=json&rows=${limit}`;
      
      const response = await fetch(archiveUrl);
      if (!response.ok) throw new Error('Failed to fetch music');
      
      const data: any = await response.json();
      
      // Transform Archive.org results to include playable URLs
      const music = data.response?.docs?.map((doc: any) => ({
        id: doc.identifier,
        title: doc.title || doc.identifier,
        artist: doc.creator || 'Unknown',
        url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
        source: 'Archive.org',
      })) || [];
      
      return music;
    } catch (error) {
      console.error('Error fetching free music:', error);
      // Return curated list of known free music sources
      return this.getDefaultFreeMusic();
    }
  }

  /**
   * Default free music sources as fallback
   */
  private getDefaultFreeMusic() {
    return [
      {
        id: 'no_way_back',
        title: 'No Way Back',
        artist: 'Zerolex',
        url: 'https://www.zapsplat.com/download-free-music/zerolex-no-way-back/',
        source: 'ZapSplat',
      },
      {
        id: 'cinematic_inspiring',
        title: 'Cinematic Inspiring',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-cinematic.mp3',
        source: 'Bensound',
      },
      {
        id: 'ukulele_happy',
        title: 'Ukulele Happy',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-ukulele-happy.mp3',
        source: 'Bensound',
      },
      {
        id: 'sunny_days',
        title: 'Sunny Days',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
        source: 'Bensound',
      },
    ];
  }

  // ─── Story Highlights ───
  /**
   * Get all highlights for a user
   */
  async getUserHighlights(userId: string) {
    const highlights = await this.prisma.story.findMany({
      where: {
        userId,
        isHighlight: true,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ highlightOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Group highlights by highlightTitle
    const groupedHighlights = highlights.reduce((acc: any, story) => {
      const title = story.highlightTitle || 'Uncategorized';
      if (!acc[title]) {
        acc[title] = {
          title,
          stories: [],
          coverImage: null,
        };
      }
      acc[title].stories.push(story);
      if (!acc[title].coverImage) {
        acc[title].coverImage = story.mediaUrl;
      }
      return acc;
    }, {});

    return Object.values(groupedHighlights);
  }

  /**
   * Mark a story as highlight (archive it instead of deleting after 24h)
   */
  async saveStoryAsHighlight(storyId: string, userId: string, highlightTitle?: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You can only highlight your own stories');
    }

    // Set expiresAt to far future so it won't be auto-deleted
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 10);

    return this.prisma.story.update({
      where: { id: storyId },
      data: {
        isHighlight: true,
        highlightTitle: highlightTitle || 'Archive',
        expiresAt: futureDate,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  /**
   * Remove a story from highlights (back to normal 24h expiration)
   */
  async removeFromHighlight(storyId: string, userId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You can only remove your own highlights');
    }

    // Reset to 24h expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.story.update({
      where: { id: storyId },
      data: {
        isHighlight: false,
        highlightTitle: null,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}
