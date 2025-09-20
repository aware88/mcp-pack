import https from 'node:https';

export async function fetchText(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Request failed with status ${response.statusCode}`));
        response.resume();
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
    });

    request.on('error', (error) => reject(error));
  });
}
