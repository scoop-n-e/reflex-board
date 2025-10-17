# フロントエンドプロジェクトテンプレート構築手順

## 達成済み

- Framework / Lang: TypeScript, React, Next.js
- UI: Tailwind CSS, shadcn/ui
- パッケージ / ランタイム: Volta, Corepack, pnpm
- コード品質管理: Biome, lefthook
- フォーム処理: react-hook-form
- バリデーション: Zod
- 状態管理: Zustand
- データフェッチ・状態管理: TanStack Query

## インストールのみ完了

- APIクライアント生成: orval
- 単体・結合テスト: Vitest, Testing Library
- モック: Mock Service Worker

## 前提条件

- Volta がインストール済み
- Git が設定済み

## volta+corepack+pnpmの導入

以下をグローバルに実行

```bash
$ volta install corepack
$ volta install node@22
$ corepack enable
```

## Next.jsプロジェクトの初期化

空のプロジェクトルートで以下を実行

```bash
$ pnpm create next-app@latest . --ts --tailwind --biome --app --no-src-dir --turbopack --no-import-alias --use-pnpm 
```

- pnpmを使用
- Typescriptを使用
- Tailwindを使用
- biomeを使用(ESLintを使わない)
- srcディレクトリを作らない
- Turbopackを使用(Rspackを使わない)
- インポートエイリアスをカスタマイズしない(`@/*`を使う)

## Nodeとpnpmのバージョン固定

```bash
$ volta pin node@22
$ corepack use pnpm@latest-10
$ pnpm install
```

## shacn/uiの導入

```bash
$ pnpm dlx shadcn@latest init
```

インタラクティブにベースカラーを聞かれる．

## lefthookの導入

```bash
$ pnpm add -D lefthook
```

### 設定ファイルの作成

package.jsonに以下を追加[1](https://lefthook.dev/installation/node.html)
```json
  "pnpm": {
    "onlyBuiltDependencies": ["lefthook"]
  }
```

プロジェクトルートに`lefthook.yml`を作成[2](https://lefthook.dev/configuration/)
```yaml
# lefthook.yml
assert_lefthook_installed: true
no_tty: true

pre-commit:
  parallel: true
  commands:
    biome-format:
      run: pnpm biome format --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
      glob: "*.{js,jsx,ts,tsx,json,jsonc}"
      stage_fixed: true
    
    biome-lint:
      run: pnpm biome lint --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
      glob: "*.{js,jsx,ts,tsx}"
      stage_fixed: true
    
    typecheck:
      run: pnpm tsc --noEmit
      glob: "*.{ts,tsx}"

pre-push:
  parallel: false
  commands:
    test:
      run: pnpm test --passWithNoTests
      skip:
        - merge
        - rebase
    
    build:
      run: pnpm build
      skip:
        - merge
        - rebase
```

### Tailwind用の設定

@custom-variant / @theme / @apply は Tailwind CSS v4 で正当なディレクティブですが、Biome の noUnknownAtRules ルールが現状それらを未知と判定します。（v4 のディレクティブは Tailwind 公式に掲載。@custom-variant/@variant、@theme 参照）
[3](https://tailwindcss.com/docs/functions-and-directives?utm_source=chatgpt.com)
[4](https://biomejs.dev/linter/rules/no-unknown-at-rules/)
[5](https://github.com/biomejs/biome/issues/7223?utm_source=chatgpt.com)

biome.jsonのlinter.rulesに以下を追加．@custom-variant / @theme / @apply は Tailwind CSS v4の対策
```json
"suspicious": {
  "noUnknownAtRules": "off"
}
```

```bash
$ pnpm lefthook install
```

## コマンドの設定

package.jsonにpnpmのコマンドを追加．
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
  }
}
```

## Zod + react-hook-form の導入

```bash
$ pnpm add zod react-hook-form @hookform/resolvers
```

## Zustand の導入

```bash
$ pnpm add zustand
```

## TanStack Query の導入

```bash
$ pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

## orval の導入

```bash
pnpm add -D orval
```

## Vitest + Testing Library の導入

```bash
$ pnpm add -D vitest @vitejs/plugin-react @vitest/coverage-v8 vite-tsconfig-paths
$ pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
$ pnpm add -D @vitest/ui jsdom
```

## Mock Service Worker (MSW)  の導入

```bash
$ pnpm add -D msw@latest
$ pnpm dlx msw init ./public --save
```

## TODO

- E2Eテスト: Playwright
- コンポーネントカタログ: Storybook

### Playwright の導入

```bash
$ pnpm add -D @playwright/test
$ pnpm dlx playwright install
```

- `pnpm dlx playwright install --with-deps`はArchだと失敗
- ブラウザを全てインストールせず, `pnpm dlx playwright install chromium` のように一部ブラウザのみをインストールする選択肢もある.

### Storybook の導入

```bash
$ pnpm dlx storybook@latest init
or
$ pnpm dlx storybook@latest init --skip-install
$ pnpm add -D @storybook/addon-a11y @storybook/addon-vitest # 嘘かも
or
手動インストール
```

- PostCSS周りの問題あり.@storybook/nextjs-viteが悪さをしているかも？
