import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import { prisma } from "../../infra/db.js";
import ApiError from "../../utils/apiError.js";
import bcrypt from "bcrypt"
import ms from "ms"
import { generateAccessToken, generateRefreshToken, TokenPayload, REFRESH_TOKEN_EXPIRY_MS } from "../../utils/tokens.js";
import ApiResponse from "../../utils/apiResponse.js";

const hashPassword = (password: string): Promise<string> => {
    const saltRound = 10
    return bcrypt.hash(password, saltRound);
}
const generateTokens = (data: TokenPayload) => {
    const accessToken = generateAccessToken(data)
    const refreshToken = generateRefreshToken(data)
    return { accessToken, refreshToken }
}
const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: REFRESH_TOKEN_EXPIRY_MS
}

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string, password: string };
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }
    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        throw new ApiError(401, "Invalid email or password.");
    }
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
        throw new ApiError(401, "Invalid email or password.")
    }
    const { accessToken, refreshToken } = generateTokens({ userId: user.id })
    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
        }
    })
    return res.status(200).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { accessToken }, "Login successful.")
        )

})

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const exists = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (exists) {
        throw new ApiError(409, "User already exists");
    }
    const hashedPassword: string = await hashPassword(password)
    const user = await prisma.user.create({
        data: {
            email,
            name: email.split("@")[0],
            password: hashedPassword,
        },
    });
    const { accessToken, refreshToken } = generateTokens({ userId: user.id })
    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
        }
    })
    return res.status(201).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, { accessToken }, "Registration Successful")
        )
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user;
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new ApiError(401, "No refresh token");
    }
    await prisma.refreshToken.deleteMany({
        where: {
            token: refreshToken
        }
    });
    return res.clearCookie("refreshToken", options).status(200)
        .json(
            new ApiResponse(200, {}, "Successfully Logged Out")
        )

})
export const logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    await prisma.refreshToken.deleteMany({
        where: {
            userId,
        }
    })
    return res.clearCookie("refreshToken", options).status(200)
        .json(
            new ApiResponse(200, {}, "Successfully Logged Out")
        )
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken
    const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
            token: refreshToken,
            revoked: false,
            expiresAt: { gt: new Date() }
        }
    })
    if (!tokenRecord) throw new ApiError(401, "Unauthorized")
    const userId = tokenRecord.userId

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({ userId })
    await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        }
    });
    return res.status(200).cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, { accessToken }, "Token refreshed")
        )
})  