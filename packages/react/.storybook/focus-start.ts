/**
 * Puts focus on a sentinel button at the very start of the page, so the next real Tab or click
 * moves focus for real. blur() is not enough: Chrome keeps its Tab starting point on the
 * element that lost focus.
 */
export function focusStart(): void {
  let sentinel = document.getElementById('focus-start');
  if (!sentinel) {
    sentinel = document.createElement('button');
    sentinel.id = 'focus-start';
    sentinel.textContent = 'Start';
    document.body.prepend(sentinel);
  }
  sentinel.focus();
}
