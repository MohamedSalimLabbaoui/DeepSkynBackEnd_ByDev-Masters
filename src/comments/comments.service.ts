import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { Comment } from '@prisma/client';

export interface CommentWithUser extends Comment {
  user: { id: string; name: string | null; avatar: string | null };
  _count?: { likes: number; replies?: number };
  isLiked?: boolean;
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajouter un commentaire à un post (ou une réponse)
   */
  async create(
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentWithUser> {
    // Vérifier que le post existe
    const post = await this.prisma.post.findUnique({
      where: { id: createCommentDto.postId },
    });

    if (!post) {
      throw new NotFoundException(`Post ${createCommentDto.postId} non trouvé`);
    }

    // Si c'est une réponse, vérifier que le parent existe
    if (createCommentDto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Commentaire parent ${createCommentDto.parentId} non trouvé`);
      }
    }

    return this.prisma.comment.create({
      data: {
        userId,
        postId: createCommentDto.postId,
        comment: createCommentDto.comment,
        parentId: createCommentDto.parentId,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  }

  /**
   * Récupérer les commentaires d'un post
   */
  async findByPost(
    postId: string,
    page: number = 1,
    limit: number = 20,
    currentUserId?: string,
  ): Promise<{ data: CommentWithUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post ${postId} non trouvé`);
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { postId, parentId: null }, // Only top-level comments by default
        orderBy: { createdAt: 'desc' }, // Show newest first for comments usually, or 'asc' for conversation
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          _count: { select: { likes: true, replies: true } },
          likes: currentUserId ? { where: { userId: currentUserId } } : false,
          replies: {
            take: 3, // Preview some replies
            include: {
              user: { select: { id: true, name: true, avatar: true } },
              _count: { select: { likes: true } },
            }
          }
        },
      }),
      this.prisma.comment.count({ where: { postId, parentId: null } }),
    ]);

    const data = comments.map(c => ({
      ...c,
      isLiked: currentUserId ? c.likes?.length > 0 : false,
      likes: undefined,
    }));

    return { 
      data, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Récupérer les réponses d'un commentaire
   */
  async findReplies(
    parentId: string,
    currentUserId?: string,
  ): Promise<CommentWithUser[]> {
    const replies = await this.prisma.comment.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true } },
        likes: currentUserId ? { where: { userId: currentUserId } } : false,
      },
    });

    return replies.map(r => ({
      ...r,
      isLiked: currentUserId ? r.likes?.length > 0 : false,
      likes: undefined,
    }));
  }

  /**
   * Récupérer un commentaire par ID
   */
  async findOne(id: string, currentUserId?: string): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, replies: true } },
        likes: currentUserId ? { where: { userId: currentUserId } } : false,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    return {
      ...comment,
      isLiked: currentUserId ? comment.likes?.length > 0 : false,
      likes: undefined,
    } as CommentWithUser;
  }

  /**
   * Liker / Unliker un commentaire
   */
  async toggleLike(commentId: string, userId: string): Promise<{ liked: boolean }> {
    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.commentLike.create({
      data: { userId, commentId },
    });
    return { liked: true };
  }

  /**
   * Modifier un commentaire (propriétaire uniquement)
   */
  async update(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres commentaires',
      );
    }

    return this.prisma.comment.update({
      where: { id },
      data: { comment: updateCommentDto.comment },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  }

  /**
   * Supprimer un commentaire (propriétaire uniquement)
   */
  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Commentaire ${id} non trouvé`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }

    await this.prisma.comment.delete({ where: { id } });
  }

  /**
   * Compter les commentaires d'un post
   */
  async countByPost(postId: string): Promise<number> {
    return this.prisma.comment.count({ where: { postId } });
  }
}
