const attachIPToSession = (req, res, next) => {
    // Получаем IP-адрес пользователя
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Устанавливаем IP-адрес в сессии
    req.session.ip = ip;
    next();
};

export default attachIPToSession;