declare module '*.module.less' {
  const classes: {
    [key: string]: string;
  };
  export default classes;
}

interface IMockConfig {
  mocking?: boolean; // 全局开关
  defaultRequestContentType?: TRequestContentType;
  httpApiHostWhiteList?: string[]; // http接口白名单
  mode?: TMode;
  ignoreParams?: string[];
  userId?: string;
}

type TMode = 'frontend' | 'backend';

interface IProject {
  id?: string;
  /* 项目名称 */ name?: string;
  /*项目描述 */ desc?: string /* 创建时间 */;
  createAt?: string /* 更新时间 */;
  updateAt?: string /* 项目开启 */;
  active?: boolean;
  versions?: IVersion[];
}

interface IVersion {
  version: number;
  locked: boolean;
  id?: string;
  previousId?: string;
  pages: IPage[];
}

type TRuntimeResponse = {
  [key: string]: IResponseData;
};

interface IPage {
  url?: string;
  title?: string;
  apiCapture?: boolean; // 页面级开启api抓取
  apis: TApiConfig[];
}

interface IPageConfig {
  mocking: boolean; // 全局开关
  apiCapture: boolean; // 页面级开启api抓取
  mode: 'backend' | 'frontend';
  httpApiHostwhiteList: string[];
  ignoreParams: string[];
  apis: TApiConfig[];
  defaultRequestContentType: TRequestContentType;
}

type TMessageType =
  | 'updateActiveProject'
  | 'removePage'
  | 'responseData'
  | 'requestData'
  | 'updateApiInfo'
  | 'updatePageInfo';

interface IMessage {
  type: TMessageType;
  data: any;
}

type TUpdateApiInfo = {
  url: string;
  pageUrl?: string;
  mocking?: boolean;
  name?: string;
  description?: string;
  method?: Method;
  latestParams?: {
    [key: string]: any;
  };
  scenes?: IScene[];
  // defaultResponseText?: string; version?: string;
  debugInfo?: IDebugInfoMtop | IDebugInfoHttp;
  requestContentType?: TRequestContentType;
};

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PAT';

type TRequestContentType = 'application/json' | 'applic';

interface IBaseApiConfig {
  id: string;
  mocking: boolean;
  stared?: boolean;
  //是否是最近新建的，区分抓取的接口和之前版本创建的接口 isLatest?:boolean; name: string;
  description?: string;
  url: string;
  method: Method;
  latestParams?: {
    [key: string]: any;
  };
  scenes: IScene[];
}

interface IScene {
  name: string;
  id: string;
  active?: boolean;
  mapRuleRequests?: {
    id: string;
    rule: string;
    ruleName?: string;
    latestParams: {
      [key: string]: any;
    };
    responseText?: string;
  }[];
  temporaryMapRuleRequest?: {
    id: string;
    rule: string;
    latestParams: {
      [key: string]: any;
    };
    responseText?: string;
  };
  defaultResponse?: {
    responseText?: string;
  };
}

interface DebugInfoBase {
  method?: Method;
  dataSourcePath?: string[];
  url?: string;
  requestParams?: {
    key: string;
    value: any;
    description: string;
  }[];

  mappingResponse?: {
    actualDataPath: string;
    mockDataPath: string;
  }[];
  responseDataIncorrect?: string;
}

interface IDebugInfoMtop extends DebugInfoBase {
  version?: string;
}

interface IDebugInfoHttp extends DebugInfoBase {
  requestContentType?: TRequestContentType;
}

// defaultResponseText?:string;
//变更前的接口数据，以便产出报告对比 previousApi?:IBaseApiConfig;

interface IMtopApiConfig extends IBaseApiConfig {
  version?: string;
  isMtop: true;
  debugInfo?: IDebugInfoMtop;
}

interface IHttpApiConfig extends IBaseApiConfig {
  requestContentType: TRequestContentType;
  isMtop?: false;
  debugInfo?: IDebugInfoHttp;
}

type TApiConfig = IMtopApiConfig | IHttpApiConfig;

interface IResponseData {
  isMtop: boolean;
  url: string;
  pageURL: string;
  method: Method;
  requestParams: string | { [key: string]: any };
  query?: {
    [key: string]: any;
  };
  response: {
    [key: string]: any;
  };
  version?: string;
}
