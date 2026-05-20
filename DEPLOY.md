# 배포 방법

이 프로젝트는 React/Vite 프론트엔드와 Express/Socket.IO 백엔드를 하나의 Node 서버로 배포하도록 구성되어 있습니다.

## 로컬 확인

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

브라우저에서 `http://localhost:4000`을 열면 빌드된 앱이 Express 서버에서 실행됩니다.

## Render 배포

1. GitHub에 이 프로젝트를 업로드합니다.
2. Render에서 `New` -> `Blueprint`를 선택합니다.
3. 이 저장소를 연결합니다.
4. `render.yaml` 설정을 확인한 뒤 배포합니다.

또는 Web Service로 직접 만들 경우 아래 값을 사용합니다.

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variable: `NODE_ENV=production`

배포 후 Render가 제공하는 URL을 열면 됩니다.
