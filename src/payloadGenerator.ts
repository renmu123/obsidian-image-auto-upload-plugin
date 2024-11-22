import { getBlobArrayBuffer } from "obsidian";

type PayloadAndBoundary = [ArrayBuffer, string];

type InputType = string | Blob | ArrayBuffer | File;

export type PayloadData = { [key: string]: InputType | InputType[] };

export const randomString = (length: number) =>
  Array(length + 1)
    .join((Math.random().toString(36) + "00000000000000000").slice(2, 18))
    .slice(0, length);

export async function payloadGenerator(
  payload_data: PayloadData
): Promise<PayloadAndBoundary> {
  const boundary_string = `Boundary${randomString(16)}`;
  const boundary = `------${boundary_string}`;
  const chunks: Uint8Array[] = [];

  for (const [key, values] of Object.entries(payload_data)) {
    for (const value of Array.isArray(values) ? values : [values]) {
      chunks.push(new TextEncoder().encode(`${boundary}\r\n`));
      if (typeof value === "string") {
        chunks.push(
          new TextEncoder().encode(
            `Content-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
          )
        );
      } else if (value instanceof File) {
        chunks.push(
          new TextEncoder().encode(
            `Content-Disposition: form-data; name="${key}"; filename="${
              value.name
            }"\r\nContent-Type: ${
              value.type || "application/octet-stream"
            }\r\n\r\n`
          )
        );
        chunks.push(new Uint8Array(await getBlobArrayBuffer(value)));
        chunks.push(new TextEncoder().encode("\r\n"));
      } else if (value instanceof Blob) {
        chunks.push(
          new TextEncoder().encode(
            `Content-Disposition: form-data; name="${key}"; filename="blob"\r\nContent-Type: ${
              value.type || "application/octet-stream"
            }\r\n\r\n`
          )
        );
        chunks.push(new Uint8Array(await value.arrayBuffer()));
        chunks.push(new TextEncoder().encode("\r\n"));
      } else {
        chunks.push(new Uint8Array(await new Response(value).arrayBuffer()));
        chunks.push(new TextEncoder().encode("\r\n"));
      }
    }
  }

  chunks.push(new TextEncoder().encode(`${boundary}--\r\n`));

  const payload = new Blob(chunks, {
    type: "multipart/form-data; boundary=" + boundary_string,
  });
  return [await payload.arrayBuffer(), boundary_string];
}
