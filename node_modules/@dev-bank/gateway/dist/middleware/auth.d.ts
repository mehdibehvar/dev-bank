import { Request, Response, NextFunction } from 'express';
import { ApiKeyType } from '@dev-bank/shared';
export interface AuthenticatedRequest extends Request {
    merchant?: {
        id: string;
    };
    apiKeyType?: ApiKeyType;
    idempotencyKey?: string;
}
export declare function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireSecretKey(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function idempotencyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function validatePaymentCreate(req: Request, res: Response, next: NextFunction): void;
export declare function validateWebhookCreate(req: Request, res: Response, next: NextFunction): void;
export declare function maskSensitiveData(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map