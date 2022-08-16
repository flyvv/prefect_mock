import { defineConfig } from 'umi';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

export default defineConfig({
  copy: ['manifest.json'] as any,
  chainWebpack(memo, { env }) {
    memo.devServer.hot = false as any;
    memo.plugins.delete('hmr');
    memo.plugin('monaco-editor').use(MonacoWebpackPlugin, [
      {
        languages: ['json'],
      },
    ]);
    memo
      .entry('/extension/background/index')
      .add('./src/background/index.ts')
      .end()
      .entry('/extension/content-script/index')
      .add('./src/content-script/index.ts')
      .end()
      .entry('/extension/page-script/index')
      .add('./src/page-script/index.ts')
      .end();
  },
  routes: [
    {
      path: '/',
      component: '../pages/index',
      routes: [
        {
          path: '/',
          component: '../pages/index',
        },
      ],
    },
  ],
  fastRefresh: {},
});
