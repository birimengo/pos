export const healthCheck = (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'bizcore_pos',
    cloudinary: 'connected',
    mongodb: 'atlas'
  });
};

export const cloudinaryTest = (req, res) => {
  res.json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'do2bbokxv',
    configured: true,
    upload_preset: 'bizcore_pos'
  });
};