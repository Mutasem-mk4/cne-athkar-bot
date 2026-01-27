const connectDB = require('../lib/db');
const { Video } = require('../bot');

module.exports = async (req, res) => {
    try {
        console.log('🔍 Manual DB Test started...');
        const conn = await connectDB();
        console.log('✅ DB Connection object obtained');

        console.log('📊 Querying Video count...');
        const count = await Video.countDocuments();
        console.log('✅ Video count:', count);

        res.status(200).json({
            status: 'success',
            connected: true,
            videoCount: count,
            modelName: Video.modelName
        });
    } catch (error) {
        console.error('❌ DB Test Failure:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
};
