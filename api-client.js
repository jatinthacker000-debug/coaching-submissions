const COACH_KEY = "coach_password";

function getCoachPassword() {
  return sessionStorage.getItem(COACH_KEY) || "";
}

function setCoachPassword(password) {
  sessionStorage.setItem(COACH_KEY, password);
}

function clearCoachPassword() {
  sessionStorage.removeItem(COACH_KEY);
}

function hasCoachPassword() {
  return Boolean(getCoachPassword());
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

async function fetchQuestionPapers() {
  const response = await fetch("/api/question-papers");
  return parseResponse(response);
}

async function createQuestionPaper(payload) {
  const response = await fetch("/api/question-papers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getCoachPassword()}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

async function deleteQuestionPaper(id) {
  const response = await fetch(`/api/question-papers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getCoachPassword()}`,
    },
  });
  return parseResponse(response);
}

async function fetchSubmissions(questionPaperId) {
  const query = questionPaperId ? `?questionPaperId=${encodeURIComponent(questionPaperId)}` : "";
  const response = await fetch(`/api/submissions${query}`, {
    headers: {
      Authorization: `Bearer ${getCoachPassword()}`,
    },
  });
  return parseResponse(response);
}

async function submitAnswers(payload) {
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

async function deleteSubmission(id) {
  const response = await fetch(`/api/submissions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getCoachPassword()}`,
    },
  });
  return parseResponse(response);
}

async function regradeSubmission(id) {
  const response = await fetch(`/api/regrade?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getCoachPassword()}`,
    },
  });
  return parseResponse(response);
}

async function uploadImage(file, folder, coachAuth = false) {
  const compressed = await compressImage(file);
  const base64 = await fileToBase64(compressed);

  const headers = { "Content-Type": "application/json" };
  if (coachAuth) {
    headers.Authorization = `Bearer ${getCoachPassword()}`;
  }

  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: compressed.name,
      type: compressed.type,
      data: base64,
      folder,
    }),
  });

  const data = await parseResponse(response);
  return data.url;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isToday(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

async function uploadManyImages(files, folder, coachAuth = false, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], folder, coachAuth);
    urls.push(url);
    if (onProgress) onProgress(i + 1, files.length);
  }
  return urls;
}

async function fetchNotes() {
  const response = await fetch("/api/notes");
  return parseResponse(response);
}

async function createNote(payload) {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getCoachPassword()}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

async function deleteNote(id) {
  const response = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getCoachPassword()}`,
    },
  });
  return parseResponse(response);
}
