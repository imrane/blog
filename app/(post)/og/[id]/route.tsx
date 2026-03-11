export const revalidate = 300;

import { ImageResponse } from "next/og";
import { getPosts } from "@/app/get-posts";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export async function generateStaticParams() {
  return (await getPosts()).map(post => ({ id: post.id }));
}

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

const geistSansBold = readFont([
  join(process.cwd(), "fonts/geist-bold.ttf"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2"),
  join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff"),
]);

const geistMono = readFont([
  join(process.cwd(), "fonts/geist-mono-regular.ttf"),
  join(process.cwd(), "node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff2"),
  join(process.cwd(), "node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff"),
]);

export async function GET(_req: Request, props) {
  const params = await props.params;

  const { id } = params;

  const posts = await getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        tw="flex p-10 h-full w-full bg-white flex-col"
        style={font("Geist")}
      >
        <header tw="flex text-[36px] w-full">
          <div style={font("Geist Medium")}>
            Guillermo Rauch
          </div>
          <div tw="grow" />
          <div tw="text-[28px]">rauchg.com</div>
        </header>

        <main tw="flex grow pb-3 flex-col items-center justify-center">
          <div tw="flex">
            <div
              tw="p-8 text-7xl font-medium rounded-md text-center"
              style={font("Geist Medium")}
            >
              {post.title}
            </div>
          </div>

          <div
            tw="mt-5 flex text-3xl text-gray-500"
            style={font("Geist Mono")}
          >
            {post.date}{post.views >= 10000 ? ` – ${post.viewsFormatted} views` : ''}
          </div>
        </main>
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
          name: "Geist Bold",
          data: geistSansBold,
          weight: 700,
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
