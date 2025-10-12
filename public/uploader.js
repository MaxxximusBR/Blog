document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  $("btn").addEventListener("click", async () => {
    $("msg").textContent = "Clicou… enviando…";
    const fd = new FormData();
    fd.append("slug", $("slug").value.trim());
    fd.append("title", $("title").value.trim());
    if ($("summary").value.trim()) fd.append("summary", $("summary").value.trim());
    if ($("global").value.trim())  fd.append("global", $("global").value.trim());
    const f = $("file").files[0];
    if (!f) { $("msg").textContent = "Selecione um PDF."; return; }
    fd.append("file", f);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      $("msg").textContent = (res.ok ? "OK: " : "Erro: ") + (j.msg || res.status);
      if (j.file) $("msg").innerHTML += `<br>URL: <a target=_blank href="${j.file}">${j.file}</a>`;
    } catch (e) {
      $("msg").textContent = "Falha de rede: " + e.message;
    }
  });
});
