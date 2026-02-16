export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateWeddingSlug(name1: string, name2: string): string {
  const combined = `${name1}-and-${name2}`;
  const slug = slugify(combined);

  if (!slug) {
    const timestamp = Date.now();
    return `wedding-${timestamp}`;
  }

  return slug;
}
