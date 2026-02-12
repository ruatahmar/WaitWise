import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import ms from "ms";
import "dotenv/config";
import ApiError from "./apiError.js";

const privateKey = process.env.TOKEN_KEY;
if (!privateKey) {
    throw new Error("TOKEN_KEY is not defined");
}
const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";


export const REFRESH_TOKEN_EXPIRY_MS = ms(
    refreshTokenExpiry as ms.StringValue
);



export interface TokenPayload {
    userId: number;
}

export const generateAccessToken = (data: TokenPayload) => {
    return jwt.sign(data, privateKey, { expiresIn: accessTokenExpiry as SignOptions["expiresIn"] });
};

export const generateRefreshToken = (data: TokenPayload) => {
    return jwt.sign(data, privateKey, { expiresIn: refreshTokenExpiry as SignOptions["expiresIn"] });
};

export const verifyToken = (token: string): TokenPayload => {
    try {
        const payload = jwt.verify(token, privateKey);
        return payload as TokenPayload;
    }
    catch {
        throw new ApiError(400, "Invalid or expired payload");
    }
};
