const createForm = document.getElementById("createForm");
const createResult = document.getElementById("createResult");
const uploadForm = document.getElementById("uploadForm");
const uploadResult = document.getElementById("uploadResult");

createForm.addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(createForm);
  const adminKey = form.get("adminKey");

  const response = await fetch("/api/memories", {
    method: "POST",
    headers: { "x-admin-key": adminKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      celebrantName: form.get("celebrantName"),
      title: form.get("title"),
      intro: form.get("intro")
    })
  });

  const data = await response.json();
  if (!response.ok) {
    createResult.textContent = data.error || "Could not create.";
    createResult.className = "result error";
    return;
  }

  createResult.className = "result success";
  createResult.innerHTML = `
    <strong>Memory Lane created.</strong><br>
    Code: <code>${data.memory.slug}</code><br>
    View: <a href="/#${data.memory.slug}">Open Memory Lane</a>
  `;
});

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(uploadForm);
  const slug = form.get("slug");

  const response = await fetch(`/api/memories/${encodeURIComponent(slug)}/photos`, {
    method: "POST",
    body: form
  });

  const data = await response.json();
  if (!response.ok) {
    uploadResult.textContent = data.error || "Upload failed.";
    uploadResult.className = "result error";
    return;
  }

  uploadResult.className = "result success";
  uploadResult.innerHTML = `
    <strong>${data.photos.length} photo(s) uploaded.</strong><br>
    <a href="/#${slug}">View Memory Lane →</a>
  `;
  uploadForm.reset();
});
