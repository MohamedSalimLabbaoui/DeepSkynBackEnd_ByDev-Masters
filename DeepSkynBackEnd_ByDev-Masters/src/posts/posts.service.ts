import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { Post } from '@prisma/client';

export interface PostWithDetails extends Post {
  user: { id: string; name: string | null; avatar: string | null };
  _count: { likes: number; comments: number };
  isLiked?: boolean;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouveau post
   */
  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    return this.prisma.post.create({
      data: {
        userId,
        message: createPostDto.message,
        media: createPostDto.media,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Récupérer le feed (tous les posts paginés)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    currentUserId?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    let where: any = { user: { isPublic: true } };

    if (currentUserId) {
      // 1. Get list of users I follow
      const followed = await this.prisma.follower.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = followed.map((f) => f.followingId);

      // 2. Feed = My posts + People I follow
      // Logic: I want to see MY posts AND posts from people I follow
      where = {
        userId: { in: [currentUserId, ...followingIds] },
        status: 'published',
      };
    } else {
      where.status = 'published';
    }


    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true, isPublic: true } },
          _count: { select: { likes: true, comments: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true, type: true } }
            : false,
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const postsWithLiked = posts.map((post: any) => ({
      ...post,
      isLiked: currentUserId ? post.likes?.length > 0 : false,
      reaction: (currentUserId && post.likes?.length > 0) ? post.likes[0].type : null,
      likes: undefined,
    }));

    return { 
      data: postsWithLiked, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Récupérer les posts d'un utilisateur
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    currentUserId?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { 
          userId,
          status: currentUserId === userId ? { not: 'deleted' } : 'published',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true, type: true } }
            : false,
        },
      }),
      this.prisma.post.count({ 
        where: { 
          userId,
          status: currentUserId === userId ? { not: 'deleted' } : 'published',
        } 
      }),
    ]);

    const postsWithLiked = posts.map((post: any) => ({
      ...post,
      isLiked: currentUserId ? post.likes?.length > 0 : false,
      reaction: (currentUserId && post.likes?.length > 0) ? post.likes[0].type : null,
      likes: undefined,
    }));

    return { 
      data: postsWithLiked, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findArchives(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { 
          userId,
          status: 'archived',
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId }, select: { id: true, type: true } },
        },
      }),
      this.prisma.post.count({ 
        where: { 
          userId,
          status: 'archived',
        } 
      }),
    ]);

    const postsWithLiked = posts.map((post: any) => ({
      ...post,
      isLiked: post.likes?.length > 0,
      reaction: post.likes?.length > 0 ? post.likes[0].type : null,
      likes: undefined,
    }));

    return { 
      data: postsWithLiked,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un post par ID
   */
  async findOne(id: string, currentUserId?: string): Promise<PostWithDetails> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
        likes: currentUserId
          ? { where: { userId: currentUserId }, select: { id: true } }
          : false,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post ${id} non trouvé`);
    }

    return {
      ...post,
      isLiked: currentUserId ? (post as any).likes?.length > 0 : false,
      reaction: (currentUserId && (post as any).likes?.length > 0) ? (post as any).likes[0].type : null,
      likes: undefined as any,
    } as PostWithDetails;
  }

  /**
   * Mettre à jour un post (seulement par le propriétaire)
   */
  async update(
    id: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Post ${id} non trouvé`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres posts',
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Supprimer un post (seulement par le propriétaire)
   */
  async remove(id: string, userId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Post ${id} non trouvé`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres posts',
      );
    }

    return this.prisma.post.delete({ where: { id } });
  }

  /**
   * Archiver/Désarchiver un post
   */
  async toggleArchive(id: string, userId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Post ${id} non trouvé`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez archiver que vos propres posts',
      );
    }

    const nextStatus = post.status === 'archived' ? 'published' : 'archived';

    return this.prisma.post.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async findAllForAdmin(
    page: number = 1,
    limit: number = 20,
    options?: { reported?: boolean; userId?: string },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.reported ? { message: { startsWith: '[FLAGGED]' } } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const mapped = posts.map((post) => ({
      ...post,
      isFlagged: post.message.startsWith('[FLAGGED]'),
      reportsCount: post.message.startsWith('[FLAGGED]') ? 1 : 0,
    }));

    return { posts: mapped, total, page, limit };
  }

  async moderatePost(
    id: string,
    payload: { flagged: boolean; remove?: boolean; reason?: string },
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post ${id} non trouvé`);
    }

    if (payload.remove) {
      await this.prisma.post.delete({ where: { id } });
      return { removed: true, id };
    }

    const flaggedPrefix = '[FLAGGED]';
    const alreadyFlagged = post.message.startsWith(flaggedPrefix);
    let nextMessage = post.message;

    if (payload.flagged && !alreadyFlagged) {
      nextMessage = `${flaggedPrefix} ${post.message}`;
    }

    if (!payload.flagged && alreadyFlagged) {
      nextMessage = post.message.replace(/^\[FLAGGED\]\s*/, '');
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: { message: nextMessage },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      ...updated,
      isFlagged: payload.flagged,
      reportsCount: payload.flagged ? 1 : 0,
      moderationReason: payload.reason || null,
    };
  }
}
