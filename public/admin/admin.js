// Small helpers for admin pages without the editor: confirmation before destructive form posts.
document.addEventListener('submit', function (e) {
  var form = e.target;
  var msg = form.getAttribute && form.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});
