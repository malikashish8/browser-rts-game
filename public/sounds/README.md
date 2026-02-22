# Sound Effects

Place your downloaded sound files here. The game will automatically use them.

## Required Files:

### 1. `arrow.mp3`
- **Type**: Arrow whoosh/flight sound
- **Duration**: ~0.3-0.5 seconds
- **Search terms**: "arrow whoosh", "arrow flight", "bow arrow"

### 2. `spear.mp3`
- **Type**: Spear thrust/stab sound
- **Duration**: ~0.2-0.4 seconds
- **Search terms**: "spear stab", "sword slash", "blade swing"

### 3. `lance.mp3`
- **Type**: Heavy impact/cavalry charge sound
- **Duration**: ~0.3-0.5 seconds
- **Search terms**: "heavy impact", "lance hit", "cavalry charge", "metal crash"

## Where to Download Free Sounds:

### Freesound.org (CC0 License)
1. Go to https://freesound.org
2. Search for the sound type
3. Filter by "CC0" license (no attribution required)
4. Download as MP3 or WAV (convert to MP3 if needed)

### Zapsplat.com
1. Go to https://zapsplat.com
2. Free registration required
3. Search for sound effects
4. Download and rename to match filenames above

### Mixkit.co
- https://mixkit.co/free-sound-effects/
- Free, no attribution required
- Good selection of game sounds

## File Format:
- **Format**: MP3 (recommended) or WAV
- **Bit rate**: 128-192 kbps
- **Mono or Stereo**: Either works

## Fallback:
If sound files are not found, the game will use procedural Web Audio API sounds as fallback (current behavior).

## Volume:
Sounds are automatically played at 40% volume. Adjust in `src/audio/sfx.ts` if needed.
