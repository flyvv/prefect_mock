import { defineConfig } from 'umi';

export default defineConfig({
  copy: ['manifest.json'] as any,
  chainWebpack(memo, { env }) {
    memo.devServer.hot = false as any;
    memo.plugins.delete('hmr');
    memo
      .entry('background')
      .add('./src/background/index.ts')
      .end()
      .entry('content-script')
      .add('./src/content-script/index.ts')
      .end()
      .entry('page-script')
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
