/** The example circuits that came with the desktop program. */
const files = import.meta.glob('../esc/fixtures/*.esc', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export const EXAMPLES = Object.entries(files)
  .map(([path, url]) => ({ name: path.split('/').pop()!, url }))
  .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
