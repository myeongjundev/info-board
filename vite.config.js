import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// data/records.json 은 Actions 가 저장소 루트에 커밋한다. 화면은 그 파일을 진짜로
// fetch 해서 읽는다 — import 로 번들에 넣으면 카드 3 의 '다시 시도' 가 아무것도
// 다시 하지 않게 되고, 네트워크 요청 주소도 남지 않는다.
//
// 개발 중에는 미들웨어로 바로 내주고, 빌드할 때는 dist 로 복사한다.
// 이것 하나 하자고 의존성을 늘리지 않는다.
const RECORDS = 'data/records.json';

function serveRecords() {
  return {
    name: 'serve-records',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(`/${RECORDS}`)) return next();
        try {
          const body = await readFile(resolve(process.cwd(), RECORDS), 'utf8');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(body);
        } catch {
          res.statusCode = 404;
          res.end('{"error":"no records"}');
        }
      });
    },
    async closeBundle() {
      const out = resolve(process.cwd(), 'dist', RECORDS);
      await mkdir(resolve(out, '..'), { recursive: true });
      await copyFile(resolve(process.cwd(), RECORDS), out);
    },
  };
}

export default defineConfig(({ command }) => ({
  // GitHub Pages 는 저장소 이름 아래에 붙는다. 개발 중에는 루트로 둔다.
  base: command === 'build' ? (process.env.VITE_BASE ?? '/info-board/') : '/',
  server: { port: 5174, strictPort: true },
  plugins: [react(), serveRecords()],
}));
