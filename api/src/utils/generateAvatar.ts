const AVATAR_STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'miniavs', 'personas', 'pixel-art', 'thumbs'] as const;
const BACKGROUND_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'e0f3db', 'fde2e4', 'fad2e1', 'eddcd2', 'fff1e6'] as const;

type AvatarStyle = typeof AVATAR_STYLES[number];
type BackgroundColor = typeof BACKGROUND_COLORS[number];

export const generateAvatar = (seed?: string, style?: AvatarStyle): string => {
  const randomSeed = seed ?? Math.random().toString(36).substring(2, 10);
  const randomStyle = style ?? AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  const randomBg = BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)];
  
  return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${encodeURIComponent(randomSeed)}&backgroundColor=${randomBg}`;
};

export default generateAvatar;
