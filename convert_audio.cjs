/**
 * Script to convert .mp4 audio files to proper web-compatible formats
 * by re-wrapping them as .m4a (which browsers accept as audio/mp4)
 * and also checking that existing audio files are valid.
 */
const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'public', 'assets', 'audio');

// Check which audio files exist and their sizes
console.log('=== Audio files in public/assets/audio ===');
const files = fs.readdirSync(audioDir);
files.forEach(f => {
    const stats = fs.statSync(path.join(audioDir, f));
    console.log(`  ${f} — ${stats.size} bytes`);
});

// The .mp4 source files — just copy them with .m4a extension
// Browsers decode .m4a (audio/mp4) but may reject .mp4 extension
const conversions = [
    {
        src: path.join(__dirname, 'Audio References', 'Game_Music', 'DEATHMATCH.mp4'),
        dst: path.join(audioDir, 'bgm_combat.m4a'),
    },
    {
        src: path.join(__dirname, 'Audio References', 'Game_Music', 'GAME OVER.mp4'),
        dst: path.join(audioDir, 'bgm_gameover.m4a'),
    },
    {
        src: path.join(__dirname, 'Audio References', 'Game_Music', 'Music_ Menu.mp3'),
        dst: path.join(audioDir, 'bgm_menu.mp3'),
    },
    {
        src: path.join(__dirname, 'Audio References', 'Game_Music', 'Music_Selctcahracter.mp3'),
        dst: path.join(audioDir, 'bgm_select.mp3'),
    },
    {
        src: path.join(__dirname, 'Audio References', 'Game_Music', 'Musica de pausa.mp3'),
        dst: path.join(audioDir, 'bgm_pausa.mp3'),
    },
];

console.log('\n=== Copying/Converting audio files ===');
conversions.forEach(({ src, dst }) => {
    if (fs.existsSync(src)) {
        // Read header bytes to detect format
        const buf = fs.readFileSync(src);
        const hex = buf.slice(0, 12).toString('hex');
        const hasMP4Box = buf.indexOf(Buffer.from('ftyp')) !== -1;
        const isMP3 = (hex.startsWith('fff') || hex.startsWith('494433'));
        
        console.log(`  ${path.basename(src)}:`);
        console.log(`    Size: ${buf.length} bytes`);
        console.log(`    Header: ${hex}`);
        console.log(`    Is MP4/M4A container: ${hasMP4Box}`);
        console.log(`    Is MP3: ${isMP3}`);
        
        // Copy file
        fs.copyFileSync(src, dst);
        console.log(`    → Copied to ${path.basename(dst)}`);
    } else {
        console.log(`  MISSING: ${src}`);
    }
});

// Also check the domain audio files
console.log('\n=== Checking domain/SFX audio ===');
const checkFiles = [
    'gojo_domain.m4a', 'sukuna_domain.m4a',
    'gojo_blue.m4a', 'gojo_red.mp3', 'hollow_purple.m4a',
    'sukuna_dismantle.mp3', 'sukuna_fuga.mp3',
    'Slash.1.m4a', 'Slash.5.m4a', 'Slash.11.m4a',
];
checkFiles.forEach(f => {
    const fp = path.join(audioDir, f);
    if (fs.existsSync(fp)) {
        const buf = fs.readFileSync(fp);
        const hex = buf.slice(0, 12).toString('hex');
        const hasMP4Box = buf.indexOf(Buffer.from('ftyp')) !== -1;
        console.log(`  ✓ ${f} — ${buf.length} bytes — MP4: ${hasMP4Box}`);
    } else {
        console.log(`  ✗ ${f} — MISSING!`);
    }
});
