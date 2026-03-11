export const revalidate = 300;

import { ImageResponse } from "next/og";
import { getPosts } from "@/app/get-posts";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import commaNumber from "comma-number";

// Image
const rauchgPhoto = toArrayBuffer(
  readFileSync(join(process.cwd(), "public/images/rauchg.png"))
);

function readFont(candidates: string[]) {
  for (const file of candidates) {
    if (existsSync(file)) return readFileSync(file);
  }
  throw new Error(`Font not found. Tried: ${candidates.join(", ")}`);
}

const geistSans = readFont([
  join(process.cwd(), "fonts/geist-regular.ttf"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"),
]);

const geistSansMedium = readFont([
  join(process.cwd(), "fonts/geist-medium.ttf"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-500-normal.woff"),
]);

const geistMono = readFont([
  join(process.cwd(), "fonts/geist-mono-regular.ttf"),
  join(process.cwd(), "node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff2"),
  join(process.cwd(), "node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff"),
]);

export async function GET() {
  const posts = await getPosts();
  const viewsSum = posts.reduce((sum, post) => sum + post.views, 0);

  return new ImageResponse(
    (
      <div tw="flex p-10 h-full w-full bg-white flex-col" style={font("Geist")}>
        <main tw="flex grow pt-4 w-full justify-center items-center">
          <div tw="flex flex-row">
            <div tw="flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                tw="h-74"
                alt="Guillermo Rauch"
                // @ts-ignore
                src={rauchgPhoto}
              />
            </div>

            <div tw="flex flex-col px-10 grow text-[28px] h-70 justify-center">
              <div tw="text-[64px] mb-7" style={font("Geist Medium")}>
                Guillermo Rauch
              </div>
              <div tw="flex mb-5" style={font("Geist Mono")}>
                <span tw="text-gray-400 mr-3">&mdash;</span> CEO and Founder of
                Vercel
              </div>
              <div tw="flex mb-5" style={font("Geist Mono")}>
                <span tw="text-gray-400 mr-3">&mdash;</span> Creator of Next.js,
                Socket.IO, Mongoose
              </div>
              <div tw="flex" style={font("Geist Mono")}>
                <span tw="text-gray-400 mr-3">&mdash;</span> Lives in San
                Francisco, CA
              </div>
            </div>
          </div>
        </main>

        <footer
          tw="flex w-full justify-center text-2xl text-gray-500 mb-6"
          style={font("Geist Mono")}
        >
          {posts.length} posts / {commaNumber(viewsSum)} views
        </footer>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: geistSans,
          weight: 400,
        },
        {
          name: "Geist Medium",
          data: geistSansMedium,
          weight: 500,
        },
        {
          name: "Geist Mono",
          data: geistMono,
          weight: 400,
        },
      ],
    }
  );
}

// lil helper for more succinct styles
function font(fontFamily: string) {
  return { fontFamily };
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}
