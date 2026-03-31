const fs = require('fs');
const path = require('path');

const srcFiles = [
    { src: 'Images references/Gojo Domain Sign.jpg', dst: 'public/assets/images/gojo_sign.jpg' },
    { src: 'Images references/Sukuna Domain Sign.jpg', dst: 'public/assets/images/sukuna_sign.jpg' }
];

srcFiles.forEach(file => {
    fs.copyFileSync(path.join(__dirname, file.src), path.join(__dirname, file.dst));
    console.log(`Copied ${file.src} to ${file.dst}`);
});
