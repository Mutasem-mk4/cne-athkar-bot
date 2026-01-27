module.exports = (req, res) => {
    const token = process.env.BOT_TOKEN || '';
    res.status(200).json({
        length: token.length,
        prefix: token.substring(0, 5),
        suffix: token.substring(token.length - 5),
        hasWhitespace: /\s/.test(token),
        nodeVersion: process.version
    });
};
