/**
 * The desktop never stops moving: the terminal types its intro, the wallpaper
 * plays, the cat chases the cursor, and the sparks, icons and PSP animate.
 * Visual record/compare checks call this once the desktop is up, so every
 * capture sees the same frame.
 *
 * It waits for the terminal's prompt and for the wallpaper to settle into its
 * loop, holds the loop on its first frame, hides the cat and sparks, and stops
 * CSS animations and transitions. The returned function undoes the freeze.
 */
export async function stillDesktop(page) {
  // The prompt appears once the intro has finished typing.
  await page.locator('.term__input').waitFor({ state: 'attached' });
  // The intro is removed once the loop plays, leaving one video to hold.
  await page.locator('.fracture-background video[src*="intro"]').waitFor({ state: 'detached' });
  const loop = page.locator('.fracture-background video');
  await loop.evaluate(video => {
    video.pause();
    const seeked = new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
    video.currentTime = 0;
    return seeked;
  });
  const style = await page.addStyleTag({ content: `
    .desktop-sparks, .neko { display: none !important; }
    *, *::before, *::after { animation: none !important; transition: none !important; }
  ` });

  return async () => {
    await style.evaluate(element => element.remove());
    await loop.evaluate(video => video.play());
  };
}
