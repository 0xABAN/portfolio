export async function stillDesktop(page) {
  await page.locator('.term__input').waitFor({ state: 'attached' });
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
