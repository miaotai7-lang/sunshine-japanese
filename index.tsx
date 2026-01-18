<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>閃閃開発 - AI 日语学习</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#4f46e5">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --safe-bottom: env(safe-area-inset-bottom, 1rem);
            --base-font-size: 1.125rem;
        }
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #f8fafc;
            padding-bottom: calc(5rem + var(--safe-bottom)); 
        }
        /* 强制隐藏注音标签 */
        rt, rp { display: none !important; }
        ruby { display: inline !important; }
        .Japanese-text {
            font-size: var(--base-font-size) !important;
            line-height: 1.8 !important; 
            word-break: break-all;
            transition: opacity 0.3s ease;
        }
        .Japanese-text.hidden-content {
            opacity: 0;
            pointer-events: none;
        }
        .translation-text.hidden-content {
            display: none;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    </style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.3",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "react/": "https://esm.sh/react@^19.2.3/",
    "react-router-dom": "https://esm.sh/react-router-dom@^7.12.0",
    "vite": "https://esm.sh/vite@^7.3.1",
    "@vitejs/plugin-react": "https://esm.sh/@vitejs/plugin-react@^5.1.2",
    "@google/genai": "https://esm.sh/@google/genai@^1.37.0"
  }
}
</script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
</body>
</html>
