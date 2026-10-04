const landing = document.getElementById("landing");
const memory = document.getElementById("memory");
const input = document.getElementById("slugInput");
const openBtn = document.getElementById("openBtn");

openBtn.addEventListener("click", () => {
  const slug = input.value.trim();
  if (slug) location.hash = slug;
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter") openBtn.click();
});

async function loadMemory(slug) {
  try {
    const response = await fetch(`/api/memories/${encodeURIComponent(slug)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Memory not found.");

    landing.classList.add("hidden");
    memory.classList.remove("hidden");

    const photos = data.photos || [];
    memory.innerHTML = `
      <section class="memory-hero">
        ${data.memory.cover_url ? `<img src="${escapeHtml(data.memory.cover_url)}" alt="" class="cover">` : ""}
        <div class="hero-overlay">
          <p class="eyebrow">MEMORY LANE</p>
          <h1>${escapeHtml(data.memory.celebrant_name)}</h1>
          <p>${escapeHtml(data.memory.title)}</p>
          ${data.memory.intro ? `<div class="intro">${escapeHtml(data.memory.intro)}</div>` : ""}
        </div>
      </section>

      <section class="gallery-wrap">
        <div class="gallery-top">
          <div>
            <p class="eyebrow">THE MEMORIES</p>
            <h2>${photos.length} ${photos.length === 1 ? "memory" : "memories"}</h2>
          </div>
          <a class="button ghost" href="/admin.html">Add Photos</a>
        </div>
        <div class="gallery">
          ${photos.length ? photos.map(photoCard).join("") : `<div class="empty">No photos yet. Add the first memory.</div>`}
        </div>
      </section>
    `;
  } catch (err) {
    landing.classList.remove("hidden");
    memory.classList.add("hidden");
    alert(err.message);
  }
}

function photoCard(p) {
  return `
    <article class="photo-card">
      <img src="${escapeHtml(p.image_url)}" loading="lazy" alt="${escapeHtml(p.caption || "Birthday memory")}">
      ${(p.caption || p.contributor) ? `
        <div class="photo-meta">
          ${p.caption ? `<div>${escapeHtml(p.caption)}</div>` : ""}
          ${p.contributor ? `<small>— ${escapeHtml(p.contributor)}</small>` : ""}
        </div>` : ""}
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function route() {
  const slug = location.hash.slice(1).trim();
  if (slug) loadMemory(slug);
}

window.addEventListener("hashchange", route);
route();
