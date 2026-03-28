import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private resolveUserId(req: any): string {
    const direct = req.user?.id || req.user?.sub;
    if (direct) return direct;

    const authHeader = req.headers?.authorization as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const parts = token.split('.');
      if (parts.length >= 2) {
        try {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
          const payload = JSON.parse(payloadJson) as {
            sub?: string;
            id?: string;
            userId?: string;
          };
          const tokenUserId = payload.sub || payload.id || payload.userId;
          if (tokenUserId) return tokenUserId;
        } catch {
          // ignore invalid token format and use fallback
        }
      }
    }

    return '89324390-127f-48c4-b382-2aef40f76add';
  }

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer un message',
    description:
      'Envoie un message au chatbot IA skincare et reçoit une réponse',
  })
  @ApiResponse({ status: 200, description: 'Réponse du chatbot' })
  @ApiResponse({ status: 400, description: 'Message invalide' })
  // @UseGuards(KeycloakAuthGuard)
  async sendMessage(@Req() req: any, @Body() sendMessageDto: SendMessageDto) {
    const userId = this.resolveUserId(req);
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Historique des chats',
    description: "Récupère l'historique des conversations",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Nombre max de résultats',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Offset pour pagination',
  })
  @ApiResponse({ status: 200, description: 'Liste des conversations' })
  // @UseGuards(JwtAuthGuard)
  async getMyChats(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = this.resolveUserId(req);
    return this.chatService.findAllByUser(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Obtenir un chat spécifique
   */
  @Get(':id')
  // @UseGuards(JwtAuthGuard)
  async getChat(@Req() req: any, @Param('id') id: string) {
    const userId = this.resolveUserId(req);
    return this.chatService.findOne(id, userId);
  }

  /**
   * Supprimer un chat
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // @UseGuards(JwtAuthGuard)
  async deleteChat(@Req() req: any, @Param('id') id: string) {
    const userId = this.resolveUserId(req);
    await this.chatService.remove(id, userId);
  }

  /**
   * Supprimer tout l'historique de chat
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async deleteAllChats(@Req() req: any) {
    const userId = this.resolveUserId(req);
    const count = await this.chatService.removeAll(userId);
    return { deletedCount: count };
  }

  // ========== ADMIN ENDPOINTS ==========

  /**
   * [ADMIN] Statistiques des chats
   */
  @Get('admin/statistics')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  async getStatistics() {
    return this.chatService.getStatistics();
  }
}
