declare const API_URL = "http://localhost:3000";
interface TestResult {
    testName: string;
    success: boolean;
    status?: number;
    response?: any;
    error?: string;
    duration: number;
}
declare function testTranslateText(): Promise<TestResult>;
declare function testTranslateEmpty(): Promise<TestResult>;
declare function testHealthCheck(): Promise<TestResult>;
declare function main(): Promise<void>;
