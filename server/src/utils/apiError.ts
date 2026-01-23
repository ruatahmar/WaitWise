class ApiError extends Error {
    constructor(
        statusCode: Number,
        message: String = "API Error"
    ) {
        super(message)
        this.statusCode = statusCode
    }
}

export default ApiError;
