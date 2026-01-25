import asyncHandler from "../../utils/asyncHandler.js"
import { Request, Response } from "express"

export const createQueue = asyncHandler(async (req: Request,res: Response)=>{
    const { name, maxActive, tokenTTL } = req.body

})

export const joinQueue = asyncHandler(async (req: Request,res: Response)=>{
    const { name, maxActive, tokenTTL } = req.body

})

export const getQueueStatus = asyncHandler(async (req: Request,res: Response)=>{
    const { name, maxActive, tokenTTL } = req.body

})