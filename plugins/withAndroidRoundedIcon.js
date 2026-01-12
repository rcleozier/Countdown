const {
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to set Android adaptive icon to use rounded corners instead of circle
 * This removes the round icon variant which forces the system to use the adaptive icon
 * with the launcher's default shape (usually rounded square/squircle)
 */
const withAndroidRoundedIcon = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const resPath = path.join(projectRoot, 'app/src/main/res');
      
      // Find all mipmap directories that might contain adaptive icon XML files
      const mipmapDirs = ['mipmap-anydpi-v26', 'mipmap-anydpi-v27', 'mipmap-anydpi-v28'];
      
      for (const mipmapDir of mipmapDirs) {
        const mipmapPath = path.join(resPath, mipmapDir);
        
        if (fs.existsSync(mipmapPath)) {
          // Remove ic_launcher_round.xml if it exists
          // This prevents the system from using a circular mask
          const roundIconPath = path.join(mipmapPath, 'ic_launcher_round.xml');
          if (fs.existsSync(roundIconPath)) {
            fs.unlinkSync(roundIconPath);
            console.log(`[withAndroidRoundedIcon] Removed ${roundIconPath}`);
          }
          
          // Also check for round icons in regular mipmap directories
          const regularMipmapDirs = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
          for (const regularDir of regularMipmapDirs) {
            const regularPath = path.join(resPath, regularDir);
            if (fs.existsSync(regularPath)) {
              const roundIconPng = path.join(regularPath, 'ic_launcher_round.png');
              if (fs.existsSync(roundIconPng)) {
                fs.unlinkSync(roundIconPng);
                console.log(`[withAndroidRoundedIcon] Removed ${roundIconPng}`);
              }
            }
          }
        }
      }
      
      return config;
    },
  ]);
};

module.exports = withAndroidRoundedIcon;

