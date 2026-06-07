export declare enum UserRole {
    ADMIN = "admin"
}
export declare class User {
    id: number;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
