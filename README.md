# 문제 출제 도구

React + Vite로 만든 정적 웹앱입니다. 문제은행 관리, 시험지 순서 구성(중간 삽입 포함), 미리보기/인쇄/워드 복사 기능을 제공합니다.

## 왜 하얀 화면이 떴었나요?

이전에 드린 `.jsx` 파일은 Claude 안에서만 동작하는 "아티팩트"용 코드였습니다. GitHub Pages는 파일을 그대로 서빙만 할 뿐, JSX를 변환하거나 React를 불러와주지 않기 때문에 파일 하나만 올리면 빈 화면이 됩니다. 이 폴더는 실제로 빌드해서 배포할 수 있는 완전한 프로젝트입니다.

## 로컬에서 확인하기

```bash
npm install
npm run dev
```

터미널에 뜨는 주소(보통 http://localhost:5173)를 브라우저로 열면 바로 확인할 수 있습니다.

## 배포 방법 (택 1)

### 방법 A — Vercel / Netlify (가장 간단, 추천)

1. 이 프로젝트를 GitHub 저장소에 push 합니다.
2. vercel.com 또는 netlify.com 에서 "Add New Project/Site" → 방금 push한 저장소 선택.
3. 빌드 명령/설정은 Vite 프로젝트를 자동 인식하므로 그대로 두고 배포하면 끝입니다. (Build command: `npm run build`, Publish directory: `dist`)

### 방법 B — GitHub Pages

```bash
npm install
npm run deploy
```

`package.json`의 `deploy` 스크립트가 `dist` 폴더를 `gh-pages` 브랜치로 올려줍니다. 이후 저장소의 **Settings → Pages**에서 Source를 `gh-pages` 브랜치로 지정하세요.

## 데이터 저장 방식

문제은행과 시험지 구성 내용은 브라우저의 localStorage에 저장됩니다. 즉, **같은 브라우저·같은 기기**에서는 새로고침해도 유지되지만, 다른 기기와 자동으로 동기화되지는 않습니다. 여러 사람이 같이 쓰거나 기기 간 동기화가 필요하면 별도의 데이터베이스(예: Firebase, Supabase) 연동이 필요합니다.
