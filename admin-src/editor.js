// Admin editor (F-003, F-004, F-008, F-021, F-022). Bundled to public/admin/editor.js by scripts/build-admin.mjs.
import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import { TextSelection } from '@tiptap/pm/state';

const data = JSON.parse(document.getElementById('post-data').textContent);
const $ = (id) => document.getElementById(id);
const isPage = data.kind === 'page';

// ---------- Read-more break: one per post, text above it is the intro on the home page ----------
const ReadMore = Node.create({
  name: 'readMore',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  parseHTML() { return [{ tag: 'hr[data-read-more]', priority: 100 }]; },
  renderHTML({ HTMLAttributes }) { return ['hr', mergeAttributes(HTMLAttributes, { 'data-read-more': '' })]; },
  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'read-more-break';
      dom.setAttribute('contenteditable', 'false');
      dom.innerHTML = '<span class="rm-line"></span><span class="rm-label">Läs mer – texten ovanför visas på startsidan</span><span class="rm-line"></span>';
      return { dom };
    };
  },
  addCommands() {
    return {
      insertReadMore: () => ({ tr, state, dispatch }) => {
        const positions = [];
        state.doc.descendants((node, pos) => { if (node.type.name === 'readMore') positions.push(pos); });
        if (dispatch) {
          for (const pos of positions.reverse()) tr.delete(pos, pos + 1);
          const $to = state.selection.$to;
          const at = tr.mapping.map($to.depth >= 1 ? $to.after(1) : $to.pos);
          const pos = Math.min(at, tr.doc.content.size);
          tr.insert(pos, this.type.create());
          // Put the cursor in the block after the break, so writing continues below it.
          const after = pos + 1;
          const next = tr.doc.nodeAt(after);
          if (!next || !next.isTextblock) tr.insert(after, state.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1)));
          tr.scrollIntoView();
        }
        return true;
      },
    };
  },
});

const editor = new Editor({
  element: $('editor'),
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      horizontalRule: false,
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener', target: null } },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right'] }),
    Placeholder.configure({ placeholder: 'Börja skriva här…' }),
    ...(isPage ? [] : [ReadMore]),
  ],
  content: data.content_html || '',
  editorProps: { attributes: { class: 'prose-admin-inner', 'aria-label': 'Text', role: 'textbox', 'aria-multiline': 'true' } },
});

// ---------- Form state ----------
const state = {
  id: data.id,
  slugTouched: !!data.slug,
  tags: [...data.tags],
  featured: data.featured,
  dirty: false,
  saving: false,
  lastSavedAt: data.updated_at,
  wasLive: data.status === 'published',
};

$('title').value = data.title;
$('slug').value = data.slug;
$('description').value = data.description;

function toLocalInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
if (data.publish_at) $('publish-at').value = toLocalInput(data.publish_at);

function currentStatus() {
  return document.querySelector('input[name="status"]:checked')?.value || 'draft';
}

function slugify(text) {
  const map = { å: 'a', ä: 'a', ö: 'o', æ: 'ae', ø: 'o', ß: 'ss' };
  return String(text).toLowerCase().replace(/[åäöæøß]/g, (c) => map[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

// ---------- Toolbar ----------
const commands = {
  bold: (c) => c.toggleBold(),
  italic: (c) => c.toggleItalic(),
  underline: (c) => c.toggleUnderline(),
  strike: (c) => c.toggleStrike(),
  bulletList: (c) => c.toggleBulletList(),
  orderedList: (c) => c.toggleOrderedList(),
  alignLeft: (c) => c.setTextAlign('left'),
  alignCenter: (c) => c.setTextAlign('center'),
  alignRight: (c) => c.setTextAlign('right'),
  blockquote: (c) => c.toggleBlockquote(),
  code: (c) => c.toggleCode(),
  codeBlock: (c) => c.toggleCodeBlock(),
  readMore: (c) => c.insertReadMore(),
};
const activeCheck = {
  bold: () => editor.isActive('bold'),
  italic: () => editor.isActive('italic'),
  underline: () => editor.isActive('underline'),
  strike: () => editor.isActive('strike'),
  link: () => editor.isActive('link'),
  bulletList: () => editor.isActive('bulletList'),
  orderedList: () => editor.isActive('orderedList'),
  alignLeft: () => !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }),
  alignCenter: () => editor.isActive({ textAlign: 'center' }),
  alignRight: () => editor.isActive({ textAlign: 'right' }),
  blockquote: () => editor.isActive('blockquote'),
  code: () => editor.isActive('code'),
  codeBlock: () => editor.isActive('codeBlock'),
};

// Keep the text focused when a toolbar button is pressed, so no keystrokes are lost.
document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
  if (e.target.closest('button[data-cmd]')) e.preventDefault();
});
document.querySelector('.toolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cmd]');
  if (!btn) return;
  const cmd = btn.getAttribute('data-cmd');
  if (cmd === 'link') {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Länkens adress (lämna tomt för att ta bort länken):', prev || 'https://');
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!url.trim() || url.trim() === 'https://') chain.unsetLink().run();
    else chain.setLink({ href: url.trim() }).run();
    return;
  }
  const fn = commands[cmd];
  if (fn) fn(editor.chain().focus()).run();
});

const blockSelect = $('block-type');
blockSelect.addEventListener('change', () => {
  const v = blockSelect.value;
  const chain = editor.chain().focus();
  if (v === 'p') chain.setParagraph().run();
  else chain.setHeading({ level: Number(v.slice(1)) }).run();
});

function refreshToolbar() {
  for (const btn of document.querySelectorAll('.toolbar [data-cmd]')) {
    const check = activeCheck[btn.getAttribute('data-cmd')];
    if (check) btn.setAttribute('aria-pressed', check() ? 'true' : 'false');
  }
  let v = 'p';
  for (const l of [2, 3, 4]) if (editor.isActive('heading', { level: l })) v = `h${l}`;
  blockSelect.value = v;
}
editor.on('selectionUpdate', refreshToolbar);
editor.on('transaction', refreshToolbar);
refreshToolbar();

// ---------- Tags ----------
function renderTags() {
  const box = $('tag-chips');
  if (!box) return;
  box.innerHTML = '';
  for (const name of state.tags) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = name;
    const x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', `Ta bort taggen ${name}`);
    x.textContent = '×';
    x.addEventListener('click', () => { state.tags = state.tags.filter((t) => t !== name); renderTags(); changed(); });
    chip.appendChild(x);
    box.appendChild(chip);
  }
}
function addTag(raw) {
  const name = raw.trim().replace(/^#/, '').slice(0, 40);
  if (!name || state.tags.some((t) => t.toLowerCase() === name.toLowerCase())) return;
  state.tags.push(name);
  renderTags();
  changed();
}
const tagInput = $('tag-input');
if (tagInput) {
  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.value);
      tagInput.value = '';
    } else if (e.key === 'Backspace' && !tagInput.value && state.tags.length) {
      state.tags.pop();
      renderTags();
      changed();
    }
  });
  tagInput.addEventListener('blur', () => { if (tagInput.value.trim()) { addTag(tagInput.value); tagInput.value = ''; } });
}
renderTags();

// ---------- Featured switch ----------
const featBtn = $('featured');
function renderFeatured() {
  if (!featBtn) return;
  featBtn.setAttribute('aria-checked', state.featured ? 'true' : 'false');
  const used = data.featuredUsed + (state.featured ? 1 : 0);
  $('featured-hint').textContent = `${used} av ${data.maxFeatured} platser används`;
}
if (featBtn) {
  featBtn.addEventListener('click', () => {
    if (!state.featured && data.featuredUsed >= data.maxFeatured) {
      showError(`Det finns redan ${data.maxFeatured} framlyfta inlägg. Ta bort framlyftningen från ett annat inlägg först.`);
      return;
    }
    state.featured = !state.featured;
    renderFeatured();
    changed();
  });
}
renderFeatured();

// ---------- Status ----------
function renderStatus() {
  const st = currentStatus();
  $('schedule').hidden = st !== 'scheduled';
  const btn = $('btn-save');
  btn.textContent = st === 'draft' ? 'Spara utkast' : st === 'scheduled' ? 'Schemalägg' : state.wasLive ? 'Uppdatera' : 'Publicera';
}
for (const r of document.querySelectorAll('input[name="status"]')) {
  r.addEventListener('change', () => {
    if (currentStatus() === 'scheduled' && !$('publish-at').value) {
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      d.setHours(9, 0, 0, 0);
      $('publish-at').value = toLocalInput(d.getTime());
    }
    renderStatus();
    changed();
  });
}
renderStatus();

// ---------- Saving ----------
const saveState = $('save-state');
function setSaveState(text) { saveState.textContent = text; }
function showError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.hidden = !msg;
}

const backupKey = () => `bloggy-backup-${state.id || 'new-' + data.kind}`;

function payload(statusOverride) {
  const st = statusOverride || currentStatus();
  let status = st === 'draft' ? 'draft' : 'published';
  let publishAt = null;
  if (st === 'scheduled') {
    const v = $('publish-at').value;
    publishAt = v ? new Date(v).getTime() : NaN;
  } else if (st === 'published' && state.wasLive && data.publish_at && data.publish_at <= Date.now()) {
    publishAt = data.publish_at;
  }
  return {
    id: state.id,
    kind: data.kind,
    title: $('title').value,
    slug: $('slug').value.trim(),
    content_html: editor.getHTML(),
    description: $('description').value,
    tags: isPage ? undefined : state.tags,
    featured: isPage ? false : state.featured,
    status,
    publish_at: publishAt,
  };
}

async function save({ auto = false } = {}) {
  if (state.saving) return false;
  const st = currentStatus();
  const body = payload(auto ? 'draft' : st);
  if (!auto && st === 'scheduled') {
    if (!body.publish_at || Number.isNaN(body.publish_at)) { showError('Välj datum och tid för schemaläggningen.'); return false; }
    if (body.publish_at <= Date.now()) { showError('Tiden för schemaläggningen har redan passerat. Välj en tid framåt, eller välj Publicerad.'); return false; }
  }
  if (!body.title.trim() && !auto) { showError('Ge inlägget en titel innan du sparar.'); return false; }
  state.saving = true;
  setSaveState('Sparar…');
  try {
    const res = await fetch('/admin/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Kunde inte spara (${res.status}).`);
    showError('');
    const post = json.post;
    const firstSave = !state.id;
    state.id = post.id;
    data.publish_at = post.publish_at;
    data.updated_at = post.updated_at;
    state.wasLive = post.display_status === 'published';
    if (!state.slugTouched || !$('slug').value) $('slug').value = post.slug;
    state.slugTouched = true;
    state.dirty = false;
    localStorage.removeItem(`bloggy-backup-new-${data.kind}`);
    localStorage.removeItem(backupKey());
    if (firstSave) history.replaceState(null, '', `/admin/edit/${post.id}`);
    const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const label = { draft: 'Utkastet sparat', published: 'Publicerat', scheduled: 'Schemalagt' }[post.display_status];
    setSaveState(`${label} ${time}`);
    renderStatus();
    return true;
  } catch (err) {
    setSaveState('');
    showError(err.message);
    return false;
  } finally {
    state.saving = false;
  }
}

let autoTimer = null;
function changed() {
  state.dirty = true;
  const st = currentStatus();
  const isDraftNow = !state.wasLive && st === 'draft';
  if (isDraftNow) {
    setSaveState('Osparade ändringar');
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if ($('title').value.trim() || !editor.isEmpty) save({ auto: true });
    }, 2500);
  } else {
    setSaveState('Osparade ändringar – tryck på knappen för att spara');
    try { localStorage.setItem(backupKey(), JSON.stringify({ at: Date.now(), ...payload() })); } catch { /* storage full or blocked */ }
  }
}

editor.on('update', changed);
$('title').addEventListener('input', () => {
  if (!state.slugTouched) $('slug').value = slugify($('title').value);
  changed();
});
$('slug').addEventListener('input', () => { state.slugTouched = true; changed(); });
$('description').addEventListener('input', changed);
$('publish-at').addEventListener('change', changed);

$('btn-save').addEventListener('click', () => save());
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save({ auto: !state.wasLive && currentStatus() === 'draft' }); }
});
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

// Offer to restore an unsaved local backup (published posts are not autosaved to the server).
try {
  const raw = localStorage.getItem(backupKey());
  if (raw) {
    const b = JSON.parse(raw);
    if (!data.updated_at || b.at > data.updated_at) {
      if (window.confirm('Det finns osparade ändringar från förra gången. Vill du återställa dem?')) {
        $('title').value = b.title || '';
        editor.commands.setContent(b.content_html || '');
        $('description').value = b.description || '';
        if (Array.isArray(b.tags)) { state.tags = b.tags; renderTags(); }
        state.dirty = true;
        setSaveState('Återställt – tryck på knappen för att spara');
      } else {
        localStorage.removeItem(backupKey());
      }
    }
  }
} catch { /* ignore broken backup */ }

// ---------- Preview (F-008): renders the current text without saving ----------
$('btn-preview').addEventListener('click', () => {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = '/admin/preview';
  form.target = '_blank';
  const p = payload();
  const fields = { title: p.title, content_html: p.content_html, description: p.description, kind: p.kind, tags: JSON.stringify(p.tags || []), status: currentStatus(), publish_at: p.publish_at || '' };
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v ?? '';
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
});

// ---------- Delete ----------
const del = $('btn-delete');
if (del) {
  del.addEventListener('click', async () => {
    if (!window.confirm(`Ta bort ${isPage ? 'sidan' : 'inlägget'} "${$('title').value || 'utan titel'}"? Det går inte att ångra.`)) return;
    const res = await fetch(`/admin/api/posts/${state.id}`, { method: 'DELETE' });
    if (res.ok) {
      state.dirty = false;
      localStorage.removeItem(backupKey());
      location.href = isPage ? '/admin?kind=page&deleted=1' : '/admin?deleted=1';
    } else {
      showError('Kunde inte ta bort. Försök igen.');
    }
  });
}

if (!data.id) $('title').focus();
