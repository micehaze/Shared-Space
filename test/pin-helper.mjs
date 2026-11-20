// Switch "who is writing" in the shared-phone mode, entering (or first creating) that person's PIN.
export const PINS = { A: '1111', B: '2222' };
export async function asPerson(p, seat) {
  await p.click(`.demo-bar [data-p="${seat}"]`);
  await p.waitForTimeout(250);
  if (await p.$('#pin1')) {
    await p.fill('#pin1', PINS[seat]);
    if (await p.$('#pin2')) await p.fill('#pin2', PINS[seat]);
    await p.click('.modal [data-ok], [data-ok]');
    await p.waitForLoadState('load').catch(() => {});
    await p.waitForTimeout(700);
  }
}
