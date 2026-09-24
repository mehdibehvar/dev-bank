import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    bankAdmin?: boolean;
}
export declare function bankAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function validateTransaction(req: Request, res: Response, next: NextFunction): void;
export declare function validateApproveReject(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map