const fs = require('fs');
const path = require('path');

const srcFiles = [
    { src: 'Audio References/General_Soundeffects/Black Flash(Better).m4a', dst: 'public/assets/audio/black_flash_better.m4a' },
    { src: 'Audio References/Gojo_Soundeffects/Ultimate Purple.m4a', dst: 'public/assets/audio/ultimate_purple.m4a' },
    { src: 'Audio References/Gojo_Soundeffects/Ultimate Red.m4a', dst: 'public/assets/audio/ultimate_red.m4a' },
    { src: 'Audio References/Sukuna_Soundeffects/Fuga(Better).m4a', dst: 'public/assets/audio/fuga_better.m4a' },
    { src: 'Audio References/Sukuna_Soundeffects/Ultimate Dismantle.m4a', dst: 'public/assets/audio/ultimate_dismantle.m4a' },
];

srcFiles.forEach(file => {
    fs.copyFileSync(path.join(__dirname, file.src), path.join(__dirname, file.dst));
    console.log(`Copied ${file.src} to ${file.dst}`);
});
