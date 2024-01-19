import jwt from "jsonwebtoken";

export default function (req, res, next) {
    if (req.method === "OPTIONS")
        next()
    try {
        const token = req.headers.authorization.split(' ')[1]
        if (!token)
            return res.status(403).json({message: "User unauthorized"})
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch (e) {
        return res.status(403).json({message: "User unauthorized"})
    }
}