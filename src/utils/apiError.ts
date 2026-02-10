class ApiError extends Error {
    statusCode: number
    constructor(
        statusCode: number,
        message: string = "API Error"
    ) {
        super(message)
        this.statusCode = statusCode
    }
    
}

export default ApiError;
