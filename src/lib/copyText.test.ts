import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyTextOrDownload, copyTextToClipboard, downloadTextFile } from './copyText';

describe('copyText helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies text when clipboard access is available', async () => {
    await expect(copyTextToClipboard('hello')).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('returns false when clipboard access is blocked', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('blocked'));

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);
  });

  it('falls back to a file download instead of browser prompt', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('blocked'));
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dayof');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
      if (tagName === 'a') {
        Object.assign(element, { click });
      }
      return element;
    });

    await expect(copyTextOrDownload('hello', 'copy.txt')).resolves.toBe('downloaded');

    expect(createObjectUrl).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:dayof');
  });

  it('downloads arbitrary text files directly', () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:direct');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
      if (tagName === 'a') {
        Object.assign(element, { click });
      }
      return element;
    });

    downloadTextFile('direct.txt', 'hello');

    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
