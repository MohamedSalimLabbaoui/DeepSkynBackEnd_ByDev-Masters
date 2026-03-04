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

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer un message',
    description:
      'Envoie un message au chatbot IA skincare et reçoit une réponse',
  })
  @ApiResponse({ status: 200, description: 'Réponse du chatbot' })
  @ApiResponse({ status: 400, description: 'Message invalide' })
  // @UseGuards(JwtAuthGuard)
  async sendMessage(@Req() req: any, @Body() sendMessageDto: SendMessageDto) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
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
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
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
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    return this.chatService.findOne(id, userId);
  }

  /**
   * Supprimer un chat
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // @UseGuards(JwtAuthGuard)
  async deleteChat(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
    await this.chatService.remove(id, userId);
  }

  /**
   * Supprimer tout l'historique de chat
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  async deleteAllChats(@Req() req: any) {
    const userId = req.user?.id || '89324390-127f-48c4-b382-2aef40f76add';
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
