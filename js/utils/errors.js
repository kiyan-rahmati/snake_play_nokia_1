
export class AppError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = "AppError";
        this.code = options.code ?? "APP_ERROR";
        this.cause = options.cause;
    }
}
