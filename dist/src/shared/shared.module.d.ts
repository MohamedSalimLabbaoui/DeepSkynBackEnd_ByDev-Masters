import { MiddlewareConsumer, NestModule } from '@nestjs/common';
export declare class SharedModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
