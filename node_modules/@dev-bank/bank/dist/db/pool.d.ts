import { Pool } from 'pg';
export declare const pool: Pool;
export declare function query<T = any>(text: string, params?: any[]): Promise<{
    rows: T[];
    rowCount: number | null;
}>;
export declare function getClient(): Promise<import("pg").PoolClient>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=pool.d.ts.map