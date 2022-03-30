export interface MockConfig {
  mock?: boolean;
  mode?: 'frontend' | 'backend';
  projects?: ProjectVersionProps[];
}

export interface ProjectVersionProps {
  name: string;
  version: ProjectItem[];
}

//项目配置
export interface ProjectItem {
  id?: string;
  version?: number | string;
  /*项目名称 */
  name?: string;
  /* 项目开启 */
  mocking?: boolean;
  /*项目描述 */
  desc?: string;
  /* 创建时间 */
  createAt?: string;
  /* 更新时间 */
  updateAt?: string;
  /* 项目页面列表 */
  pages?: PageItem[];
}

export interface PageItem {
  /* 页面 id */
  id?: string;
  /* 页面名称*/
  name?: string;
  /* 页面描述 */
  desc?: string;
  /* 页面地址 */
  url?: string;
  /* 页面 api 列表 */
  apis?: ApiItem[];
}

export interface ApiItem {
  id?: string;
  name?: string;
  desc?: string;
  type?: 'http' | 'mtop';
  defaultResponse?: string;
  url?: string; // mtop 接口信息
  mtop_name?: string;
  mtop_version?: string; // http 接口信息
  method?: string;
}

export interface SceneItem {}
