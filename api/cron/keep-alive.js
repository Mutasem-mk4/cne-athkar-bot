module.exports = (req, res) => {
    console.log('Keep-alive ping received');
    res.status(200).json({ status: 'alive' });
};
