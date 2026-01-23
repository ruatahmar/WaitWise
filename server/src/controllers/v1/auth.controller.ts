import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import ApiError from "../../utils/apiError.js";
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken, TokenPayload } from "../../utils/tokens.js";
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
    sameSite: "lax" as const
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
            password: hashedPassword
        },
    });

    const { accessToken, refreshToken } = generateTokens({ userId: user.id })
    return res.status(201).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, { accessToken }, "Registration Successful")
        )
});

export const logout = asyncHandler(async (req: Request, res: Response) => {

})