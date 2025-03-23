// Chunk size: 6MB (staying within Vercel's limits)
const CHUNK_SIZE = 6 * 1024 * 1024;

export async function uploadFileInChunks(file: File, path: string, token: string) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = `${Date.now()}-${file.name}`;
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileName', file.name);
    formData.append('fileId', fileId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('path', path);

    const response = await fetch('/api/mega/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
    }
  }

  // Finalize the upload
  const response = await fetch('/api/mega/upload/finalize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileId,
      fileName: file.name,
      path,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to finalize upload');
  }

  return response.json();
}
