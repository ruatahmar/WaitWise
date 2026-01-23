import jwt, { JwtPayload } from "jsonwebtoken";
import "dotenv/config";
import ApiError from "./apiError.js";

const privateKey = process.env.TOKEN_KEY;
if (!privateKey) {
    throw new Error("TOKEN_KEY is not defined");
}
const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export interface TokenPayload {
    userId: number;
}

export const generateAccessToken = (data: TokenPayload) => {
    return jwt.sign(data, privateKey, { expiresIn: accessTokenExpiry });
};

export const generateRefreshToken = (data: TokenPayload) => {
    return jwt.sign(data, privateKey, { expiresIn: refreshTokenExpiry });
};

export const verifyToken = (token: string): TokenPayload => {
    const payload = jwt.verify(token, privateKey);
    if (!payload) {
        throw new ApiError("Invalid or expired payload");
    }
    return payload as TokenPayload;
};
